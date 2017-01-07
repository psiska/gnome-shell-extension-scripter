INSTALLPATH=~/.local/share/gnome-shell/extensions/scripter@psiska.github.com
TARGET=scripter.zip

release:
	rm -f $(TARGET) 
	rm -f src/schemas/gschemas.compiled
	glib-compile-schemas src/schemas
	cd src && zip -r $(TARGET) * && cd ..
	mv src/$(TARGET) .

localinstall:
	mkdir -p $(INSTALLPATH)
	cp -r * $(INSTALLPATH)

