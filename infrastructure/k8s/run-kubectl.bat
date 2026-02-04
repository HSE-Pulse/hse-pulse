@echo off
set PATH=%PATH%;C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin
set CLOUDSDK_PYTHON=C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\platform\bundledpython\python.exe
kubectl %*
