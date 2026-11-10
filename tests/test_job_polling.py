import json
import unittest

from server.job_polling import JobPollCache, encode_delta


class JobPollingTest(unittest.TestCase):
    def test_large_history_is_sent_once_then_only_changed_jobs(self):
        history = [{'id': str(i), 'status': 'done', 'prompts': ['x' * 176000]}
                   for i in range(100)]
        active = {'id': 'active', 'status': 'running', 'progress': 0}
        jobs = history + [active]
        first, cursor, snapshot = encode_delta(jobs, None)
        self.assertGreater(len(first), 17_600_000)
        unchanged, same_cursor, _ = encode_delta(jobs, snapshot)
        self.assertEqual(cursor, same_cursor)
        self.assertLess(len(unchanged), 200)
        self.assertEqual(json.loads(unchanged)['jobs'], [])
        active.update(status='done', progress=1, outputs=[{'url': '/result.png'}])
        changed, next_cursor, _ = encode_delta(jobs, snapshot)
        self.assertNotEqual(cursor, next_cursor)
        self.assertLess(len(changed), 400)
        self.assertEqual(json.loads(changed)['jobs'], [active])
        self.assertEqual(json.loads(first)['jobs'], jobs[:-1] + [
            {'id': 'active', 'status': 'running', 'progress': 0}])

    def test_cache_is_bounded_scoped_and_preserves_recent_cursor(self):
        cache = JobPollCache(limit=2, per_user_limit=2)
        cache.put('a', 'first', {'private': b'fingerprint'})
        self.assertIsNone(cache.get('b', 'first'))
        cache.put('a', 'second', {})
        self.assertIsNotNone(cache.get('a', 'first'))
        cache.put('a', 'third', {})
        self.assertIsNone(cache.get('a', 'second'))
        self.assertEqual(len(cache.users['a']), 2)
        cache.put('b', 'first', {})
        self.assertIsNotNone(cache.get('a', 'first'))
        cache.put('c', 'first', {})
        self.assertIsNone(cache.get('b', 'first'))
        self.assertEqual(len(cache.users), 2)

    def test_twenty_users_and_a_busy_user_do_not_flush_other_baselines(self):
        cache = JobPollCache()
        cursors = {}
        jobs = [{'id': 'j', 'status': 'done', 'prompts': ['keep']}]
        for round_no in range(3):
            for user in range(20):
                previous = cache.get(user, cursors.get(user))
                body, cursor, snapshot = encode_delta(jobs, previous)
                self.assertEqual(json.loads(body)['reset'], round_no == 0)
                cache.put(user, cursor, snapshot)
                cursors[user] = cursor
        for revision in range(100):
            cache.put('busy', str(revision), {'changing': b'fingerprint'})
        self.assertLessEqual(len(cache.users['busy']), 4)
        for user, cursor in cursors.items():
            self.assertIsNotNone(cache.get(user, cursor))

    def test_removed_permissions_and_unknown_fields_are_not_lost(self):
        jobs = [{'id': 'j', 'status': 'running', 'permission': 'operate',
                 'custom': {'keep': True}}]
        _, _, snapshot = encode_delta(jobs, None)
        jobs[0]['permission'] = 'read'
        body, _, snapshot = encode_delta(jobs, snapshot)
        self.assertEqual(json.loads(body)['jobs'], jobs)
        body, _, _ = encode_delta([], snapshot)
        self.assertEqual(json.loads(body)['removed'], ['j'])
