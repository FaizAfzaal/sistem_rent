Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\laragon\www\sistem_rent\be-rental"
WshShell.Run """C:\Program Files\nodejs\node.exe"" daemon.js", 0, False
