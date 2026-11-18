import time
from urllib.parse import urlsplit

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = 'Wait for the database to accept connections, with a readable error if it never does.'

    def add_arguments(self, parser):
        parser.add_argument('--timeout', type=int, default=90, help='Seconds to keep retrying.')

    def handle(self, *args, timeout, **options):
        settings_dict = connection.settings_dict
        host = settings_dict.get('HOST') or '(local file)'
        self.stdout.write(f'Connecting to database at {host} ...')

        deadline = time.monotonic() + timeout
        attempt = 0
        while True:
            attempt += 1
            try:
                connection.ensure_connection()
                self.stdout.write(self.style.SUCCESS(f'Database is up (attempt {attempt}).'))
                return
            except OperationalError as e:
                error = str(e).strip().splitlines()[0]
                if time.monotonic() >= deadline:
                    raise CommandError(self._explain(host, error))
                self.stdout.write(f'  attempt {attempt} failed: {error} -- retrying in 5s')
                connection.close()
                time.sleep(5)

    def _explain(self, host, error):
        hints = ['Could not connect to the database.', f'  Host:  {host}', f'  Error: {error}', '']
        if 'resolve host' in error or 'Name or service not known' in error:
            hints += [
                'The hostname does not exist in DNS. Usually this means:',
                '  - the Aiven service is powered off or still being created '
                '(Aiven console: it must say "Running"; free services power off when idle), or',
                '  - DATABASE_URL has a typo or points at a deleted service '
                '(copy the Service URI again from the Aiven Overview tab).',
            ]
        elif 'password authentication failed' in error:
            hints += ['Wrong username or password in DATABASE_URL. Copy the Service URI again from Aiven.']
        elif 'timeout' in error.lower() or 'timed out' in error.lower():
            hints += ['The host exists but did not answer. Check Aiven\'s allowed IP addresses (should include 0.0.0.0/0).']
        return '\n'.join(hints)
