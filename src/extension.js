const { GObject, Shell, St, Clutter } = imports.gi;
const Lang = imports.lang;
const Mainloop = imports.mainloop; // timer
const Layout = imports.ui.layout;
const FileUtils = imports.misc.fileUtils;
const SystemUtils = imports.misc.util;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;


const Gettext = imports.gettext;
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const N_ = function(e) { return e; };

class PopupScriptMenuItem extends PopupMenu.PopupBaseMenuItem {

  constructor(sScriptName) {
    super();

    this.label = new St.Label({ text: sScriptName });
    this.actor.add(this.label, { expand: true });
    this.actor.label_actor = this.label;
  }

  destroy() {
    super.destroy();
  }
};


let Scripter = GObject.registerClass(
class Scripter extends PanelMenu.Button {
  _init() {
    super._init(0.0, 'Scripter');

    this._settings = Utils.getSettings();

    let _logo = new St.Icon({
      icon_name: 'content-loading-symbolic',
      style_class: 'system-status-icon',
      reactive: true,
      track_hover: true
    });

    this.actor.add_actor(_logo);

    this._createMenu();
  }

  _createMenu() {
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
  }

  _updateScriptList(config, output) {
    this.scriptItemCont.removeAll();

    let list = this._settings.get_value(Utils.SCRIPTER_SCRIPTS_KEY).unpack();
    for (let scriptname in list) {
      let sname = scriptname;
      let menuItem = new PopupScriptMenuItem(sname);
      let script = list[sname].get_child_value(0).unpack();
      let sudo = list[sname].get_child_value(1).unpack();

      menuItem.connect('activate', Lang.bind(this, function() {
        this._runScript(sname, script, sudo);
      }));

      this.scriptItemCont.addMenuItem(menuItem);
      menuItem = null;
    }
  }

  _runScript(sScriptName, sScript, bSudo) {
    global.log("Scripter executing scriptName: '" + sScriptName + "' script: '" + sScript + "' sudo: " + bSudo);
    if (bSudo) {
      sScript = "gksudo " + sScript;
      SystemUtils.spawn(sScript.split(" "));
    } else {
      SystemUtils.spawn(sScript.split(" "));
    }
    this._showNotification(_("Script") + " \"" + sScriptName + "\" " + _("completed."));
  }

  _showNotification(subject, text) {
    let source = new MessageTray.Source(_("Scripter applet"), 'utilities-scripter');

    Main.messageTray.add(source);

    let notification = new MessageTray.Notification(source, subject, text);
    notification.setTransient(true);
    source.notify(notification);
  }

  _showPreferences() {
    SystemUtils.spawn(["gnome-shell-extension-prefs", Me.metadata['uuid']]);
    return 0;
  }
});

// Init function
function init(metadata){ 

  Utils.initTranslations();
  let theme = imports.gi.Gtk.IconTheme.get_default();
  theme.append_search_path(metadata.path);
}

let _Scripter;

function enable() {
  _Scripter = new Scripter();
  Main.panel.addToStatusArea('scripter', _Scripter);
}

function disable() {
  _Scripter.destroy();
}
