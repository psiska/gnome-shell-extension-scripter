Scripter
=======

Allow to specify list of scripts, which can be executed by click from gnome-shell menu.

Example of the usage is manual mounting of the NAS shared drives. Supports gksudo for running privileged operations.


Debugging
=========

```bash
journalctl /usr/bin/gnome-shell -f -o cat
#prefs
gnome-shell-extension-prefs scripter@psiska.github.com
```

