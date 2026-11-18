# Dev helper. The venv lives outside Documents because Windows blocks
# creating one inside it on this machine (Controlled Folder Access).
#   .\dev.ps1 setup   create venv + install deps
#   .\dev.ps1 test    run the tests
#   .\dev.ps1 run     migrate and start the API on :8000 (no auto-reload)
param([string]$cmd = 'run')

$venv = Join-Path $env:USERPROFILE '.venvs\random-gift'
$py = Join-Path $venv 'Scripts\python.exe'
Set-Location $PSScriptRoot

switch ($cmd) {
    'setup' {
        python -m venv $venv
        & $py -m pip install -r requirements.txt
    }
    'test' {
        & $py manage.py test -v 1
    }
    'run' {
        & $py manage.py migrate
        # --noreload: the autoreloader starts a child Python process, which
        # Windows security blocks on this machine (WinError 5). Restart by hand after backend edits.
        & $py manage.py runserver 8000 --noreload
    }
}
