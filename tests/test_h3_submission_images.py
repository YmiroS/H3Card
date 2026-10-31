import asyncio
import io
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

    def test_reference_parser_rejects_untrusted_paths(self):
        access = ResourceAccess.__new__(ResourceAccess)
        for value in ('chouka/../secret.png', 'https://example.com/a.png', 'chouka/a%2fb.png'):
            with self.assertRaises(ValueError):
                access.reference(value)


if __name__ == '__main__':
    unittest.main()
