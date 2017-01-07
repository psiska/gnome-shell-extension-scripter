const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Mainloop = imports.mainloop; // timer
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Layout = imports.ui.layout;
const FileUtils = imports.misc.fileUtils;
const SystemUtils = imports.misc.util;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;


const Gettext = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;


Utils.initTranslations();
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

const  PopupScriptMenuItem = new Lang.Class({
  Name: 'PopupScriptMenuItem',
  Extends: PopupMenu.PopupBaseMenuItem,

  _init: function(sScriptName, params) {
    this.parent(params);

    this.scriptname = new St.Label({ text: sScriptName });
    if (this.actor instanceof St.BoxLayout) {
      this.actor.add(this.scriptname, { expand: true });
    } else {
      this.addActor(this.scriptname, { expand: true });
    }
  }
});


const Scripter = new Lang.Class({
  Name: 'Scripter',
  Extends: PanelMenu.Button,
  _init: function() {
    this.parent(0.0, 'Scripter');

    this._settings = Utils.getSettings();
    this._logo = new St.Icon({
      icon_name: 'content-loading-symbolic',
      style_class: 'system-status-icon',
      reactive: true,
      track_hover: true
    });

    this.actor.add_actor(this._logo);

    this._createMenu();
  },
  _createMenu: function() {
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._settings.connect("changed::" + Utils.SCRIPTER_SCRIPTS_KEY,
                           Lang.bind(this, this._updateScriptList));

    this.scriptItemCont = new PopupMenu.PopupMenuSection();
    let head = new PopupMenu.PopupMenuSection();
    let item = new PopupMenu.PopupMenuItem(_("Show settings"));
    item.connect('activate', Lang.bind(this, this._showPreferences));
    head.addMenuItem(item);

    this.menu.addMenuItem(head);
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(this.scriptItemCont);
 
    this._updateScriptList();
  },
  _updateScriptList: function(config, output) {
    this.scriptItemCont.removeAll();

    let list = this._settings.get_value(Utils.SCRIPTER_SCRIPTS_KEY).unpack();
    for (let scriptname in list) {
      let menuItem = new PopupScriptMenuItem(scriptname);
      menuItem.connect('activate', Lang.bind(this, function() {
        let script = list[scriptname].get_child_value(0).unpack();
        let sudo = list[scriptname].get_child_value(1).unpack();

        this._runScript(scriptname, script, sudo);
      }));
      this.scriptItemCont.addMenuItem(menuItem);
    }
  },
  _runScript: function (sScriptName, sScript, bSudo) {
    let result;
    if (bSudo) {
      sScript = "gksudo " + sScript;
      result = SystemUtils.spawn(sScript.split(" "));
    } else {
      result = SystemUtils.spawn(sScript.split(" "));
    } 
    if (result) {
      this._showNotification(_("Script") + " \"" + sScriptName + "\" " + _("completed."));
    } else {
      this._showNotification(_("Script") + " \"" + sScriptName + "\" " + _("failed."));
    } 
  },
  _showNotification: function(subject, text) {
    let source = new MessageTray.Source(_("Scripter applet"), 'utilities-scripter');

    Main.messageTray.add(source);

    let notification = new MessageTray.Notification(source, subject, text);
    notification.setTransient(true);
    source.notify(notification);
  },
  _showPreferences: function() {
    SystemUtils.spawn(["gnome-shell-extension-prefs", Me.metadata['uuid']]);
    return 0;
  }
});

// Init function
function init(metadata){ 
  let theme = imports.gi.Gtk.IconTheme.get_default();
  theme.append_search_path(metadata.path);
}

let _Scripter;


function enable(){
  _Scripter = new Scripter();
  Main.panel.addToStatusArea('scripter', _Scripter);
}

function disable(){
  _Scripter.destroy();
}
