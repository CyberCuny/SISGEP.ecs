$env:DJANGO_SETTINGS_MODULE='config.settings_test'
$env:DJANGO_SECRET_KEY='dev-secret'
$log = "$env:TEMP\django_run.txt"
python manage.py runserver 0.0.0.0:8000 --noreload 2>&1 | Out-File -FilePath $log -Encoding utf8
