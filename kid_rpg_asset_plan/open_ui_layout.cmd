@echo off
call "%~dp0serve_gallery.cmd"
start "" "http://localhost:43188/ui_layout.html"
