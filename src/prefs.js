const Gdk     = imports.gi.Gdk;
const GLib    = imports.gi.GLib;
const Gio     = imports.gi.Gio;
const St      = imports.gi.St;
const Clutter = imports.gi.Clutter;

const Lang    = imports.lang;
const Gtk     = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const Gettext        = imports.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const Utils          = Me.imports.utils;


const _  = Gettext.gettext;
const N_ = function(e) { return e; };


const Columns = {
  SCRIPT_NAME: 0,
  SCRIPT_PATH: 1,
  SCRIPT_SUDO: 2
}


const ScripterPrefsWdiget = new Lang.Class({
  Name : 'ScripterPrefsWidget',
  Extends : Gtk.Grid,
  _init: function() {
    this.parent({ orientation: Gtk.Orientation.VERTICAL,
                  column_homogeneous: false,
                  vexpand: true,
                  margin: 5,
                  row_spacing: 5});
    this._scriptlist = new Gtk.ListStore();
    this._scriptlist.set_column_types([
      GObject.TYPE_STRING,
      GObject.TYPE_STRING,
      GObject.TYPE_BOOLEAN
    ]);

    this.set_column_spacing(3);

    this._settings = Utils.getSettings();
    this._inhibitUpdate = true;
    this._settings.connect("changed", Lang.bind(this, this._refresh));

    this._initWindow();
    this._inhibitUpdate = false;
    this._refresh();
    this._scriptlist.connect("row-changed", Lang.bind(this, this._save));
    this._scriptlist.connect("row-deleted", Lang.bind(this, this._save));
  },
  _initWindow: function() {
    let curRow = 0;

    this.treeview = new Gtk.TreeView({model: this._scriptlist, expand: true});
    this.treeview.get_selection().set_mode(Gtk.SelectionMode.MULTIPLE);
    this.attach(this.treeview, 0, curRow, 3, 1);
    curRow += 1;

    let scriptname = new Gtk.TreeViewColumn({ title: _("Script"), expand: true});
    let snrenderer = new Gtk.CellRendererText({ editable: true });
    snrenderer.connect("edited", Lang.bind(this, function(renderer, pathString, newValue) {
      let [store, iter] = this._scriptlist.get_iter(Gtk.TreePath.new_from_string(pathString));
      this._scriptlist.set(iter, [Columns.SCRIPT_NAME], [newValue]);
    }));
    scriptname.pack_start(snrenderer, true);
    scriptname.add_attribute(snrenderer, "text", Columns.SCRIPT_NAME);
    this.treeview.append_column(scriptname);

    let scriptpath = new Gtk.TreeViewColumn({ title: _("Script path"), min_width: 300 });
    let sprenderer = new Gtk.CellRendererText({ editable: true });
    sprenderer.connect("edited", Lang.bind(this, function(renderer, pathString, newValue){
      let [store, iter] = this._scriptlist.get_iter(Gtk.TreePath.new_from_string(pathString));
      this._scriptlist.set(iter, [Columns.SCRIPT_PATH], [newValue]);
    }));
    scriptpath.pack_start(sprenderer, true);
    scriptpath.add_attribute(sprenderer, "text", Columns.SCRIPT_PATH);
    this.treeview.append_column(scriptpath);

    let scriptsudo = new Gtk.TreeViewColumn({ title: _("Sudo"), min_width: 100 });
    let togrenderer = new Gtk.CellRendererToggle({ radio: false });
    togrenderer.connect("toggled", Lang.bind(this, function(renderer, pathString) {
      let [store, iter] = this._scriptlist.get_iter(Gtk.TreePath.new_from_string(pathString));
      this._scriptlist.set(iter, [Columns.SCRIPT_SUDO], [!renderer.active]);
    }));
    scriptsudo.pack_start(togrenderer, true);
    scriptsudo.add_attribute(togrenderer, "active", Columns.SCRIPT_SUDO);
    this.treeview.append_column(scriptsudo);
    

    this.toolbar = new Gtk.Toolbar({ icon_size: 1 });
    this.toolbar.get_style_context().add_class("inline-toolbar");
    this.attach(this.toolbar, 0, curRow, 3, 1);
    this.addButton = new Gtk.ToolButton({ icon_name: "list-add-symbolic", use_action_appearance: false });
    this.addButton.connect("clicked", Lang.bind(this, this._addScript));
    this.toolbar.insert(this.addButton, -1);
    this.removeButton = new Gtk.ToolButton({ icon_name: "list-remove-symbolic", use_action_appearance: false });
    this.removeButton.connect("clicked", Lang.bind(this, this._removeSelectedScript));
    this.toolbar.insert(this.removeButton, -1);
  },
  _refresh: function() {
    // don't update the model if someone else is messing with the backend
    if (this._inhibitUpdate)
      return;

    let list = this._settings.get_value(Utils.SCRIPTER_SCRIPTS_KEY).unpack();
    // stop everyone from reacting to the changes we are about to produce in the model
    this._inhibitUpdate = true;
    this._scriptlist.clear();
    for (let scriptName in list) {
      // format a{s(sb)}
      let script = list[scriptName].get_child_value(0).unpack();
      let sudo = list[scriptName].get_child_value(1).unpack();
      this._scriptlist.set(this._scriptlist.append(),
        [Columns.SCRIPT_NAME, Columns.SCRIPT_PATH, Columns.SCRIPT_SUDO],
        [scriptName, script, sudo]);
    }

    this._inhibitUpdate = false;
  },
  _addScript: function() {
    let item = this._scriptlist.append();
    this._scriptlist.set(item,
      [Columns.SCRIPT_NAME, Columns.SCRIPT_PATH, Columns.SCRIPT_SUDO],
      ["", "", false]);
    this.treeview.set_cursor(this._scriptlist.get_path(item),
                             this.treeview.get_column(Columns.SCRIPT_NAME),
                             true);
  },
  _removeSelectedScript: function() {
    let [selection, store] = this.treeview.get_selection().get_selected_rows();
    let iters = [];
    for (let i = 0; i < selection.length; ++i) {
      let [isSet, iter] = store.get_iter(selection[i]);
      if (isSet) {
        iters.push(iter);
      }
    }
    // it;s ok not to inhibit updates here as remove != change
    iters.forEach(function(value, index, array) {
      store.remove(value) }
    );

    this.treeview.get_selection().unselect_all();
  },
  _save: function() {
    // don't update the backend if someone else is messing with the model
    if (this._inhibitUpdate)
      return;
    let values = [];
    this._scriptlist.foreach(function(store, path, iter) {
      values.push(GLib.Variant.new_dict_entry(
        GLib.Variant.new_string(store.get_value(iter, Columns.SCRIPT_NAME)),
        GLib.Variant.new_tuple([
          GLib.Variant.new_string(store.get_value(iter, Columns.SCRIPT_PATH)),
          GLib.Variant.new_boolean(store.get_value(iter, Columns.SCRIPT_SUDO))
        ])))
      });

    // format a{s(sb)}
    let settingsValue = GLib.Variant.new_array(GLib.VariantType.new("{s(sb)}"), values);

    // all changes have happened through the UI, we can safely
    // disable updating it here to avoid an infinite loop
    this._inhibitUpdate = true;

    this._settings.set_value(Utils.SCRIPTER_SCRIPTS_KEY, settingsValue);

    this._inhibitUpdate = false;
  }

});

function init() {
}

function buildPrefsWidget() {
  let widget = new ScripterPrefsWdiget();
  widget.show_all();
  return widget;
}
