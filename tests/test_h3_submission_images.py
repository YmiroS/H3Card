import asyncio
import io
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
import app
from server.resource_access import ResourceAccess


class H3SubmissionImages(unittest.IsolatedAsyncioTestCase):
    async def test_sizes_orientation_and_original(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'image.png'
            for size in ((4096, 2048), (2049, 100), (2048, 1024), (64, 32)):
                Image.new('RGBA', size, (12, 34, 56, 128)).save(source)
                before = source.read_bytes()
                result = await asyncio.to_thread(app.h3_image_copy, source)
                self.assertEqual(source.read_bytes(), before)
                if max(size) <= 2048:
                    self.assertIsNone(result)
                else:
                    with Image.open(io.BytesIO(result)) as image:
                        self.assertEqual(max(image.size), 2048)
                        self.assertEqual(image.mode, 'RGBA')
                        self.assertEqual(image.format, 'PNG')
            exif = Image.Exif()
            exif[274] = 6
            Image.new('RGB', (4096, 2048)).save(source, exif=exif)
            with Image.open(io.BytesIO(app.h3_image_copy(source))) as image:
                self.assertEqual(image.size, (1024, 2048))
                self.assertNotIn(274, image.getexif())

    async def test_multislot_controller_local_and_non_h3(self):
        for controller in (True, False):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                source = root / 'large.png'
                small = root / 'small.png'
                Image.new('RGB', (4096, 1024)).save(source)
                Image.new('RGB', (2048, 1024)).save(small)
                before = source.read_bytes()
                assets = {'first': 'chouka/large.png', 'last': 'chouka/small.png',
                          'ref1': '/api/file?filename=result.png&type=output',
                          'ref2': 'chouka/large.png'}
                original = dict(assets)
                calls = []

                async def resource(application, method, *args, **kwargs):
                    calls.append((method, args, kwargs))
                    if method == 'pending_external_uploads':
                        return ['large.png']
                    if method == 'reference':
                        return ResourceAccess.reference(ResourceAccess.__new__(ResourceAccess), args[0])
                    if method == 'local_path':
                        return small if args[1] == 'small.png' else source
                    if method == 'lookup':
                        return {'resource_id': 'parent'}

                async def upload(session, field, name, data):
                    with Image.open(io.BytesIO(data)) as image:
                        self.assertLessEqual(max(image.size), 2048)
                    return 'chouka/' + name

                request = SimpleNamespace(app={'session': None})
                with mock.patch.object(app, 'ROOT', root), mock.patch.object(app, 'CONTROLLER_MODE', controller), \
                     mock.patch.object(app, 'resource_call', side_effect=resource), \
                     mock.patch.object(app, 'require_resource', new_callable=mock.AsyncMock), \
                     mock.patch.object(app, 'cache_comfy_outputs', new_callable=mock.AsyncMock) as cache, \
                     mock.patch.object(app, 'comfy_upload', side_effect=upload):
                    result = await app.generation_assets(request, assets, 'project', 'minimax_h3')
                    self.assertEqual(assets, original)
                    self.assertEqual(source.read_bytes(), before)
                    self.assertEqual(result['first'], result['ref2'])
                    self.assertEqual(result['last'], assets['last'])
                    for key in ('first', 'ref1'):
                        self.assertNotEqual(result[key], assets[key])
                        with Image.open(root / 'data/uploads' / result[key].split('/')[-1]) as image:
                            self.assertEqual(image.size, (2048, 512))
                    cache.assert_awaited_once()
                    registrations = [c for c in calls if c[0] == 'register']
                    self.assertEqual(len(registrations), 2)
                    self.assertTrue(all(c[2]['parent_id'] == 'parent' and c[2]['external']
                                        and c[2]['state'] == 'pending' for c in registrations))
                    if not controller:
                        self.assertEqual(len([c for c in calls if c[0] == 'mark_delivered']), 2)
                    calls.clear()
                    # No external delivery is needed for this non-H3 control case.
                    with mock.patch.object(app, 'CONTROLLER_MODE', True), \
                         mock.patch.object(app, 'h3_image_copy') as resize:
                        self.assertEqual(await app.generation_assets(request, assets, 'project', 'krea2'), assets)
                        resize.assert_not_called()

    async def test_api_only_explicit_off_disables_copy(self):
        cid = 'minimax_h3_i2v'
        repository = mock.Mock()
        repository.read.return_value = {'cards': []}
        request = SimpleNamespace(app={'project_repository': repository})
        for value in (None, 'on', 'off', False, '', 'unexpected'):
            body = {'project': 'p', 'capability': cid, 'dry_run': True,
                    'assets': {'image': 'chouka/original.png'},
                    'params': {} if value is None else {'compress_reference_images_2k': value}}
            with self.subTest(value=value), \
                 mock.patch.object(app, 'authorized_body', new_callable=mock.AsyncMock, return_value=body), \
                 mock.patch.dict(app.CAPS, {cid: {'_graph_ok': True}}), \
                 mock.patch.object(app, 'generation_assets', new_callable=mock.AsyncMock,
                                   side_effect=RuntimeError('stop after asset dispatch')) as assets:
                with self.assertRaisesRegex(RuntimeError, 'stop after asset dispatch'):
                    await app.api_generate(request)
                assets.assert_awaited_once_with(
                    request, body['assets'], 'p', cid,
                    compress_reference_images_2k=value != 'off')

    async def test_explicit_enabled_and_disabled(self):
        request = SimpleNamespace(app={})
        assets = {'image': 'chouka/original.png'}
        for enabled in (True, False):
            with self.subTest(enabled=enabled), \
                 mock.patch.object(app, 'CONTROLLER_MODE', True), \
                 mock.patch.object(app, 'resource_call', new_callable=mock.AsyncMock) as resource:
                resource.return_value = None
                if enabled:
                    with self.assertRaises(app.web.HTTPBadRequest):
                        await app.generation_assets(request, assets, 'p', 'minimax_h3_i2v', enabled)
                    resource.assert_awaited_once_with(request.app, 'reference', assets['image'])
                else:
                    self.assertEqual(await app.generation_assets(
                        request, assets, 'p', 'minimax_h3_i2v', enabled), assets)
                    resource.assert_not_awaited()

    def test_all_h3_image_manifests_switch_and_graph(self):
        key = 'compress_reference_images_2k'
        for cid, family in app.MODEL_FAMILY.items():
            if family != 'minimax_h3':
                continue
            cap = json.loads((ROOT / 'manifests' / f'{cid}.json').read_text(encoding='utf-8'))
            switches = [s for s in cap['inputs'] if s['key'] == key]
            has_image = any(s['type'] == 'image' for s in cap['inputs'])
            with self.subTest(capability=cid):
                self.assertEqual(len(switches), int(has_image))
                if not has_image:
                    continue
                spec = switches[0]
                self.assertEqual(spec['type'], 'select')
                self.assertEqual(spec['appearance'], 'switch')
                self.assertEqual(spec['default'], 'on')
                self.assertEqual([o['value'] for o in spec['options']], ['on', 'off'])
                self.assertTrue(spec['showHint'])
                self.assertEqual(spec['hint'], '关闭后使用原始尺寸提交，可能导致内存/显存溢出、生成失败。原素材不受影响。')
                self.assertEqual(spec['target'], {'kind': 'preset'})
                # Isolate the new preset from existing required assets and presets.
                isolated = dict(cap, inputs=[spec])
                baseline = None
                for value in (None, 'on', 'off'):
                    params = {} if value is None else {key: value}
                    app.apply_input_presets(isolated, params)
                    graph = app.patch_graph(isolated, params, {})
                    if baseline is None:
                        baseline = graph
                    self.assertEqual(graph, baseline)
                    self.assertNotIn(key, json.dumps(graph))

    def test_reference_parser_rejects_untrusted_paths(self):
        access = ResourceAccess.__new__(ResourceAccess)
        for value in ('chouka/../secret.png', 'https://example.com/a.png', 'chouka/a%2fb.png'):
            with self.assertRaises(ValueError):
                access.reference(value)


if __name__ == '__main__':
    unittest.main()
