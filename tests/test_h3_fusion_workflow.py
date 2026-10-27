import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
sys.path.insert(0, str(ROOT / 'tests'))

import app
import auth_support
import scan_workflows

CAP_ID = 'minimax_h3_fusion_v2'
IMAGE_NODES = ['199', '188', '189', '190', '191', '192']


def capability():
    return json.loads((ROOT / 'manifests' / f'{CAP_ID}.json').read_text(encoding='utf-8'))


class H3FusionWorkflowTest(unittest.TestCase):
    def test_original_models_sampling_and_sparse_parameters_are_preserved(self):
        graph = app.patch_graph(capability(), {}, {})
        self.assertEqual(graph['127']['inputs']['unet_name'],
                         'Cobijada_H3_Hybrid_Uncensored_pruned_hybrid_int8_convrot_pruned.safetensors')
        self.assertEqual(graph['232']['inputs'], {
            'clip_name': 'qwen3vl_32b_minimax_h3_int8_convrot.safetensors',
            'type': 'minimax', 'device': 'default',
        })
        self.assertEqual(graph['234']['inputs']['vae_name'], 'minimax_h3_video_vae_fp16.safetensors')
        self.assertEqual(graph['235']['inputs']['vae_name'], 'minimax_h3_audio_vae_fp32.safetensors')
        self.assertEqual(graph['145']['inputs'], {
            'model': ['127', 0],
            'lora_name': 'minimax_h3_ref2v_turbo_8step_v1.0_768p_comfyui_bf16.safetensors',
            'strength_model': 0.75,
        })
        self.assertEqual(graph['123']['inputs']['sampler_name'], 'er_sde')
        self.assertEqual(graph['147']['inputs']['sigmas'],
                         '1, .9882, .973, .9524, .9231, .878, .8, .6316, .4737, .1579, 0 ')
        self.assertEqual(graph['125']['inputs']['sigmas'], ['147', 0])
        self.assertEqual(graph['165']['inputs'], {
            'model': ['156', 0], 'selection': 'sol-attn', 'selection.tau': 1.3,
            'start_percent': 0.2, 'end_percent': 1, 'dense_blocks': '',
            'min_tokens': 12288, 'extra_tokens': 256,
            'sink_conditioning': 'exact_kv_and_rows', 'verbose': True,
        })
        self.assertEqual(graph['126']['inputs']['model'], ['165', 0])
        self.assertEqual(graph['227']['inputs']['value'], 6)
        self.assertEqual(graph['228']['inputs']['megapixels'], 1.1)
        self.assertEqual(graph['136']['inputs']['ref_image_size'], 'max')
        types = [node['class_type'] for node in graph.values()]
        self.assertEqual(types.count('SamplerCustomAdvanced'), 1)
        self.assertFalse(set(types) & {'ModelPreviewOverrideKJ', 'BasicScheduler', 'SetNode', 'GetNode'})
        self.assertNotIn('taeh3', json.dumps(graph))
        self.assertNotIn('Qwen-3D', json.dumps(graph))

    def test_empty_optional_assets_never_execute_demo_loaders(self):
        cap = capability()
        self.assertEqual(cap['slotLimits'], {
            'image': {'min': 0, 'max': 6}, 'audio': {'min': 0, 'max': 3},
            'video': {'min': 0, 'max': 1},
        })
        graph = app.patch_graph(cap, {}, {})
        self.assertFalse(any(k.startswith('ref_') and k != 'ref_image_size' for k in graph['136']['inputs']))
        live = scan_workflows.upstream(graph, '148')
        self.assertTrue(live.isdisjoint(set(IMAGE_NODES) | {'182', '183', '184', '185'}))
        self.assertEqual(graph['238']['inputs']['value'], '')

    def test_all_asset_slots_keep_reference_order_and_disconnect_independently(self):
        cap = capability()
        assets = {f'images[{i}]': f'chouka/image{i}.png' for i in range(6)}
        assets.update({f'audio[{i}]': f'chouka/audio{i}.wav' for i in range(3)})
        assets['video[0]'] = 'chouka/video.mp4'
        graph = app.patch_graph(cap, {}, assets)
        for i, node in enumerate(IMAGE_NODES):
            self.assertEqual(graph[node]['inputs']['image'], assets[f'images[{i}]'])
            self.assertEqual(graph['136']['inputs'][f'ref_images.ref_image_{i}'], [node, 0])
        for i, node in enumerate(['182', '183', '184']):
            self.assertEqual(graph[node]['inputs']['audio'], assets[f'audio[{i}]'])
            self.assertEqual(graph['136']['inputs'][f'ref_audios.ref_audio_{i}'], [node, 0])
        self.assertEqual(graph['185']['inputs']['video'], assets['video[0]'])
        self.assertEqual(graph['185']['inputs']['force_rate'], 24)
        self.assertEqual(graph['185']['inputs']['frame_load_cap'], graph['136']['inputs']['length'])
        self.assertEqual(graph['136']['inputs']['ref_videos.ref_video_0'], ['185', 0])
        self.assertFalse(any(k.startswith('ref_video_audios.') for k in graph['136']['inputs']))
        sparse = app.patch_graph(cap, {}, {'images[0]': 'chouka/first.png', 'images[5]': 'chouka/last.png'})
        self.assertEqual(sparse['136']['inputs']['ref_images.ref_image_0'], ['199', 0])
        self.assertEqual(sparse['136']['inputs']['ref_images.ref_image_5'], ['192', 0])
        for i in range(1, 5):
            self.assertNotIn(f'ref_images.ref_image_{i}', sparse['136']['inputs'])

    def test_sparse_slot_references_are_remapped_once_without_changing_user_prompt(self):
        params = {'prompt': '<Picture 6> 看 <Picture 2>，<Audio 3> 配 <Video 1>；<Picture 6>。'}
        assets = {'images[1]': 'chouka/first.png', 'images[5]': 'chouka/second.png',
                  'audio[2]': 'chouka/third.wav', 'video[0]': 'chouka/video.mp4'}
        graph = app.patch_graph(capability(), params, assets)
        self.assertEqual(graph['238']['inputs']['value'],
                         '<Picture 2> 看 <Picture 1>，<Audio 1> 配 <Video 1>；<Picture 2>。')
        self.assertEqual(params['prompt'],
                         '<Picture 6> 看 <Picture 2>，<Audio 3> 配 <Video 1>；<Picture 6>。')
        self.assertEqual(graph['136']['inputs']['ref_images.ref_image_1'], ['188', 0])
        self.assertEqual(graph['136']['inputs']['ref_images.ref_image_5'], ['192', 0])
        full = {f'images[{i}]': f'chouka/image{i}.png' for i in range(6)}
        prompt = '<Picture 6> 和 <Picture 1>'
        self.assertEqual(app.patch_graph(capability(), {'prompt': prompt}, full)
                         ['238']['inputs']['value'], prompt)

    def test_unfilled_references_are_rejected_instead_of_aliasing_another_asset(self):
        for token in ('<Picture 2>', '<Audio 1>', '<Video 1>'):
            with self.subTest(token=token), self.assertRaises(app.web.HTTPBadRequest) as error:
                app.patch_graph(capability(), {'prompt': token}, {'images[5]': 'chouka/sixth.png'})
            self.assertIn(token, error.exception.reason)

    def test_sparse_attention_preserves_model_and_precision_evidence(self):
        graph = app.patch_graph(capability(), {}, {})
        summary = app.model_summary_from_graph(graph)
        self.assertTrue(summary['complete'])
        self.assertEqual(summary['precision_label'], 'INT8')
        self.assertEqual(summary['models'][0]['name'],
                         'Cobijada_H3_Hybrid_Uncensored_pruned_hybrid_int8_convrot_pruned.safetensors')
        auxiliary = {item['name']: item['role'] for item in summary['auxiliary_models']}
        self.assertEqual(auxiliary['minimax_h3_ref2v_turbo_8step_v1.0_768p_comfyui_bf16.safetensors'],
                         '辅助LoRA')
        report = {'groups': [{'capability': CAP_ID, 'model_evidence': {
            'recorded_samples': 0, 'total_samples': 1, 'variants': [],
        }}]}
        with mock.patch.dict(app.CAPS, {CAP_ID: capability()}):
            fallback = app.capacity_model_references(report)['groups'][0]['current_model_reference']
        self.assertTrue(fallback['complete'])
        self.assertEqual(fallback['models'], summary['models'])
        self.assertEqual(fallback['auxiliary_models'], summary['auxiliary_models'])
        self.assertEqual(fallback['precision_label'], 'INT8')

    def test_controls_reach_live_nodes_without_fake_steps_or_framerate(self):
        cap = capability()
        keys = {item['key'] for item in cap['inputs']}
        self.assertFalse(keys & {'steps', 'force_rate', 'frame_load_cap', 'processing_control_value'})
        params = {'prompt': '白猫眨眼', 'duration': 5, 'megapixels': 0.6,
                  'aspect_ratio': '9:16 (Portrait Widescreen)', 'seed': 2468,
                  'strength_model': 0.65, 'sigmas': '1, .5, 0'}
        graph = app.patch_graph(cap, params, {'images[0]': 'chouka/cat.png'})
        self.assertEqual(graph['238']['inputs']['value'], params['prompt'])
        self.assertEqual(graph['227']['inputs']['value'], 5)
        self.assertEqual(graph['228']['inputs']['megapixels'], 0.6)
        self.assertEqual(graph['228']['inputs']['aspect_ratio'], params['aspect_ratio'])
        self.assertEqual(graph['129']['inputs']['noise_seed'], 2468)
        self.assertEqual(graph['145']['inputs']['strength_model'], 0.65)
        self.assertEqual(graph['147']['inputs']['sigmas'], params['sigmas'])
        self.assertEqual(graph['148']['inputs']['frame_rate'], 24)
        self.assertEqual(graph['224']['inputs']['values.a'], ['227', 0])
        self.assertEqual(graph['136']['inputs']['length'], ['224', 1])

    def test_registration_links_and_bundled_chinese_progress(self):
        app.load_caps()
        self.assertIn(CAP_ID, scan_workflows.BUNDLED_CAPABILITIES)
        self.assertEqual(app.model_family(CAP_ID), 'minimax_h3')
        card = next(c for c in app.CARDS if c['id'] == 'card_video')
        self.assertEqual(sum(m['id'] == CAP_ID for m in card['modes']), 1)
        self.assertIn(CAP_ID, {m['id'] for m in scan_workflows.build_modes(
            [c for c in app.CAPS.values() if c['card'] == 'video' and c.get('graph')])})
        graph = json.loads((ROOT / capability()['graph']).read_text(encoding='utf-8'))
        self.assertEqual(set(graph), scan_workflows.upstream(graph, '148') | {'148'})
        for spec in capability()['inputs']:
            target = spec['target']
            if target.get('kind') != 'preset':
                self.assertIn(target['input'], graph[target['node']]['inputs'])
        with mock.patch.object(app, 'ZH_NODES', {}):
            for label in app.step_labels(graph).values():
                self.assertRegex(label, r'[\u4e00-\u9fff]')
                self.assertNotEqual(label, '处理中')


class H3SoundWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.caps = [json.loads(path.read_text(encoding='utf-8'))
                     for path in sorted((ROOT / 'manifests').glob('minimax_h3_*.json'))]

    def assets(self, cap, all_slots):
        assets = {spec['key']: 'chouka/' + spec['key'] + {
            'image': '.png', 'audio': '.wav', 'video': '.mp4',
        }[spec['type']] for spec in cap['inputs']
            if spec['type'] in ('image', 'audio', 'video') and (all_slots or spec.get('required'))}
        metadata = {ref: {'has_audio': True, 'width': 720, 'height': 1280,
                          'duration': 6, 'fps': 24} for key, ref in assets.items()
                    if key.startswith('video[')}
        return assets, metadata

    def test_all_h3_manifests_and_rescan_define_one_default_off_visual_switch(self):
        self.assertEqual({cap['id'] for cap in self.caps},
                         {key for key, family in app.MODEL_FAMILY.items() if family == 'minimax_h3'})
        for cap in self.caps:
            with self.subTest(cap=cap['id']):
                fields = [s for s in cap['inputs'] if s['key'] == 'sound']
                self.assertEqual(len(fields), 1)
                field = fields[0]
                self.assertEqual((field['label'], field['type'], field['appearance'], field['default']),
                                 ('声音', 'select', 'switch', 'off'))
                self.assertEqual(field['target'], {'kind': 'preset'})
                self.assertEqual(field['presets'], {'on': {}, 'off': {}})
                self.assertFalse(field.get('advanced'))
                self.assertEqual(field, next(s for s in scan_workflows.CAP_INPUT_PRESETS[cap['id']]
                                             if s['key'] == 'sound'))
                raw = json.loads((ROOT / cap['graph']).read_text(encoding='utf-8'))
                for cut in field['disconnectWhenOff']:
                    self.assertIn(cut['input'], raw[cut['node']]['inputs'])

    def test_default_and_off_disconnect_all_output_audio_dependencies_without_changing_conditioning(self):
        for cap in self.caps:
            graph_path = ROOT / cap['graph']
            before = graph_path.read_bytes()
            field = next(s for s in cap['inputs'] if s['key'] == 'sound')
            for all_slots in (False, True):
                assets, metadata = self.assets(cap, all_slots)
                original = app.patch_graph(cap, {'seed': 42, 'sound': 'on'}, assets, metadata)
                expected = copy.deepcopy(original)
                for cut in field['disconnectWhenOff']:
                    expected[cut['node']]['inputs'].pop(cut['input'])
                for selected in ({}, {'sound': 'off'}):
                    with self.subTest(cap=cap['id'], all_slots=all_slots, selected=selected):
                        params = {'seed': 42, **selected}
                        muted = app.patch_graph(cap, params, assets, metadata)
                        self.assertEqual(params['sound'], 'off')
                        self.assertEqual(muted, expected)
                        live = scan_workflows.upstream(muted, cap['output']['node'])
                        self.assertFalse(any(muted[n]['class_type'] == 'VAEDecodeAudio' for n in live))
                        for node in muted.values():
                            if node['class_type'] in ('VHS_VideoCombine', 'CreateVideo'):
                                self.assertNotIn('audio', node['inputs'])
                        for nid, node in original.items():
                            if 'Sampler' in node['class_type'] or 'ToVideo' in node['class_type']:
                                self.assertEqual(muted[nid], node, 'sampling and reference conditions must not change')
                self.assertEqual(graph_path.read_bytes(), before)

    def test_on_exactly_restores_pre_switch_workflow_and_rejects_invalid_values(self):
        for cap in self.caps:
            legacy = copy.deepcopy(cap)
            legacy['inputs'] = [s for s in legacy['inputs'] if s['key'] != 'sound']
            assets, metadata = self.assets(cap, True)
            with self.subTest(cap=cap['id']):
                expected = app.patch_graph(legacy, {'seed': 42}, assets, metadata)
                self.assertEqual(app.patch_graph(cap, {'seed': 42, 'sound': 'on'}, assets, metadata), expected)
            for invalid in (None, '', 'ON', 'false', True, False, 0, 1, [], {}):
                with self.subTest(cap=cap['id'], invalid=invalid), self.assertRaises(app.web.HTTPBadRequest):
                    app.patch_graph(cap, {'sound': invalid}, assets, metadata)

    def test_character_transfer_real_scan_keeps_sound_in_special_input_list(self):
        cap = next(c for c in self.caps if c['id'] == 'minimax_h3_character_transfer')
        raw = json.loads((ROOT / cap['graph']).read_text(encoding='utf-8'))
        oi = {node['class_type']: {'input': {'required': {}}, 'output': [],
                                  'output_node': node['class_type'] == 'SaveVideo'}
              for node in raw.values()}
        assets, metadata = self.assets(cap, True)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'graphs').mkdir()
            (root / 'manifests').mkdir()
            (root / cap['graph']).write_text(json.dumps(raw), encoding='utf-8')
            source = root / 'source.json'
            source.write_text('{}', encoding='utf-8')
            with mock.patch.object(scan_workflows, 'ROOT', root), \
                 mock.patch.object(app, 'ROOT', root), \
                 mock.patch.dict(scan_workflows.ALIASES, {'sound-rescan': cap['id']}):
                for _ in range(2):
                    rebuilt = scan_workflows.scan(source, oi, rel_key='sound-rescan')
                    fields = [s for s in rebuilt['inputs'] if s['key'] == 'sound']
                    self.assertEqual(fields, [next(s for s in cap['inputs'] if s['key'] == 'sound')])
                    self.assertIn('声音开关开启时保留原音轨', rebuilt['note'])
                    for selected in ({}, {'sound': 'off'}, {'sound': 'on'}):
                        graph = app.patch_graph(rebuilt, {'seed': 42, **selected}, assets, metadata)
                        self.assertEqual('audio' in graph['23']['inputs'], selected.get('sound') == 'on')

    def test_non_h3_workflows_do_not_gain_or_apply_the_switch(self):
        for path in (ROOT / 'manifests').glob('*.json'):
            cap = json.loads(path.read_text(encoding='utf-8'))
            if not isinstance(cap, dict) or cap.get('id', '').startswith('minimax_h3_'):
                continue
            self.assertNotIn('sound', {s['key'] for s in cap.get('inputs', [])})
        cap = json.loads((ROOT / 'manifests/zimage_t2i.json').read_text(encoding='utf-8'))
        expected = app.patch_graph(cap, {'seed': 42}, {})
        for selected in ('off', 'on'):
            self.assertEqual(app.patch_graph(cap, {'seed': 42, 'sound': selected}, {}), expected)


class H3FusionRuntimeTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def test_reload_cards_and_real_parameter_dry_run(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        self.own_project('p')
        self.enterContext(mock.patch.object(app, 'PROJ_DIR', self.root / 'data/projects'))
        self.register_asset('cat.png')
        application = self.build_app()
        application.router.add_post('/api/reload', app.api_reload)
        application.router.add_get('/api/cards', app.api_cards)
        application.router.add_post('/api/generate', app.api_generate)
        with mock.patch.object(app, 'CONTROLLER_MODE', False):
            async with TestClient(TestServer(application)) as client:
                self.client = client
                self.origin = str(client.make_url('/')).rstrip('/')
                client.session.headers.update(await self.login())
                self.assertEqual((await client.post('/api/reload')).status, 200)
                response = await client.get('/api/cards')
                self.assertEqual(response.status, 200)
                data = await response.json()
                self.assertEqual(data['capabilities'][CAP_ID]['graph'], f'graphs/{CAP_ID}.api.json')
                self.assertTrue(app.graph_ok(CAP_ID))
                card = next(c for c in data['cards'] if c['id'] == 'card_video')
                self.assertIn(CAP_ID, {m['id'] for m in card['modes']})
                response = await client.post('/api/generate', json={
                    'capability': CAP_ID, 'project': 'p', 'dry_run': True,
                    'assets': {'images[0]': 'chouka/cat.png'},
                    'params': {'prompt': '白猫转头', 'seed': 123, 'duration': 5, 'megapixels': 0.6},
                })
                self.assertEqual(response.status, 200, await response.text())
                changed = (await response.json())['changed']
                self.assertEqual(changed['#238.value'][1], '白猫转头')
                self.assertEqual(changed['#199.image'][1], 'chouka/cat.png')
                self.assertEqual(changed['#136.ref_images.ref_image_5'][1], '<断开>')
                self.assertEqual(changed['#227.value'][1], 5)
                self.assertEqual(changed['#148.audio'][1], '<断开>')
                sound = next(s for s in data['capabilities'][CAP_ID]['inputs'] if s['key'] == 'sound')
                self.assertEqual(sound['default'], 'off')
                for cap_id in (CAP_ID, 'minimax_h3_ref_2pass_bf16', 'minimax_h3_comic20'):
                    for selected in ('on', 'off'):
                        response = await client.post('/api/generate', json={
                            'capability': cap_id, 'project': 'p', 'dry_run': True,
                            'assets': {'images[0]': 'chouka/cat.png'},
                            'params': {'seed': 123, 'sound': selected},
                        })
                        self.assertEqual(response.status, 200, await response.text())
                        changes = (await response.json())['changed']
                        capability_data = data['capabilities'][cap_id]
                        spec = next(s for s in capability_data['inputs'] if s['key'] == 'sound')
                        for cut in spec['disconnectWhenOff']:
                            key = f"#{cut['node']}.{cut['input']}"
                            if selected == 'off':
                                self.assertEqual(changes[key][1], '<断开>')
                            else:
                                self.assertNotIn(key, changes)
                response = await client.post('/api/generate', json={
                    'capability': CAP_ID, 'project': 'p', 'dry_run': True,
                    'assets': {'images[5]': 'chouka/cat.png'},
                    'params': {'prompt': '<Picture 6> 转头', 'seed': 123},
                })
                self.assertEqual(response.status, 200, await response.text())
                changed = (await response.json())['changed']
                self.assertEqual(changed['#238.value'][1], '<Picture 1> 转头')
                self.assertEqual(changed['#192.image'][1], 'chouka/cat.png')


if __name__ == '__main__':
    unittest.main()
