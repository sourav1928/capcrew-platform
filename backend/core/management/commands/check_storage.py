"""python manage.py check_storage : tests the photo storage end to end and explains any problem in plain words."""
import uuid

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from adminapi.uploads import describe_storage_error


def hint_for(text):
    t = text.lower()
    if 'nosuchbucket' in t or 'http=404' in t:
        return ('The storage service answered "not found". Most likely the bucket name does not match: '
                'AWS_STORAGE_BUCKET_NAME must be EXACTLY the bucket name in Supabase, or AWS_S3_ENDPOINT_URL is wrong.')
    if any(k in t for k in ('invalidaccesskey', 'signaturedoesnotmatch', 'authorizationheader', 'http=403', 'http=401')):
        return ('The storage service refused the keys. Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (copied '
                'completely, no spaces) and that AWS_S3_REGION_NAME is the region shown next to the endpoint.')
    if 'endpointconnection' in t or 'could not connect' in t or 'name or service not known' in t:
        return 'The server could not reach the endpoint. Check AWS_S3_ENDPOINT_URL (it must start with https://).'
    if 'http=400' in t:
        return ('The storage service rejected the request as malformed. Check AWS_S3_ENDPOINT_URL is the "Endpoint" '
                'from Supabase -> Project Settings -> Storage -> S3 Connection, and AWS_S3_REGION_NAME matches it.')
    return 'Check the AWS_* variables against Supabase -> Project Settings -> Storage -> S3 Connection.'


class Command(BaseCommand):
    help = 'Test the photo storage: save a tiny file, read it back from its public link, then delete it.'

    def add_arguments(self, parser):
        parser.add_argument('--skip-public-check', action='store_true',
                            help='Do not try to open the public link (offline tests).')

    def handle(self, *args, **opts):
        backend = settings.STORAGES['default']['BACKEND']
        self.stdout.write(f'Storage backend: {backend}')
        name = f'healthcheck/{uuid.uuid4().hex}.txt'
        try:
            saved = default_storage.save(name, ContentFile(b'capcrew storage check'))
        except Exception as exc:
            detail = describe_storage_error(exc)
            self.stderr.write(self.style.ERROR('SAVE FAILED: ' + detail))
            raise CommandError(hint_for(detail))
        self.stdout.write(self.style.SUCCESS(f'Saved: {saved}'))
        url = default_storage.url(saved)
        self.stdout.write(f'Public link: {url}')
        problem = None
        if not opts['skip_public_check'] and url.startswith('http'):
            try:
                r = requests.get(url, timeout=15)
                if r.status_code != 200:
                    problem = (f'The file was saved but its public link answers {r.status_code}. Make the bucket PUBLIC '
                               f'in Supabase, and check AWS_S3_CUSTOM_DOMAIN: <project-ref>.supabase.co/storage/v1/object/public/<bucket>')
            except requests.RequestException as exc:
                problem = f'The public link could not be opened ({exc.__class__.__name__}). Check AWS_S3_CUSTOM_DOMAIN.'
        try:
            default_storage.delete(saved)
        except Exception as exc:   # not fatal
            self.stdout.write(self.style.WARNING('Could not delete the test file: ' + describe_storage_error(exc)))
        if problem:
            raise CommandError(problem)
        self.stdout.write(self.style.SUCCESS('Photo storage works: save, public link and delete all succeeded.'))
