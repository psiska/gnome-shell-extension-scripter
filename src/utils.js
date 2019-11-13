const Gio     = imports.gi.Gio;
const GLib    = imports.gi.GLib;
const Lang    = imports.lang;
const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const Config         = imports.misc.config;


var SCRIPTER_SCRIPTS_KEY = 'scripts';


function initTranslations(domain) {
  domain = domain || Me.metadata['gettext-domain'];
  Gettext.textdomain(domain);
  let localeDir = Me.dir.get_child('locale');
  if (localeDir.query_exists(null))
    Gettext.bindtextdomain(domain, localeDir.get_path());
  else
    Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}

function getSettings(schema) {
  let extension = ExtensionUtils.getCurrentExtension();
  schema = schema || extension.metadata['settings-schema'];
  const GioSSS = Gio.SettingsSchemaSource;

  let schemaDir = extension.dir.get_child('schemas');
  let schemaSource;
  if (schemaDir.query_exists(null)) {
    schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                             GioSSS.get_default(),
                                             false);
  } else {
    schemaSource = GioSSS.get_default();
  }

  let schemaObj = schemaSource.lookup(schema, true);
  if (!schemaObj)
    throw new Error('Schema ' + schema + ' could not be found for extension '
                    + Me.metadata.uuid + '. Please check your installation.');

  return new Gio.Settings({ settings_schema: schemaObj });
}


function assert(condition) {
    if (!condition) {
        // remove this in production code
        throw "Assertion failed: " + condition;
    }
}

function debug_out(obj, indent) {
  let result = "";
  if (indent == null) indent = "";
  
  for (let property in obj)
  {
    let value = obj[property];
    if (typeof value == 'string')
      value = "'" + value + "'";
    else if (typeof value == 'object')
    { 
      if (value instanceof Array)
      { 
        // Just let JS convert the Array to a string!
        value = "[ " + value + " ]";
      }
      else
      {
        // Recursive dump
        // (replace "  " by "\t" or something else if you prefer)
        let od = debug_out(value, indent + "  ");
        // If you like { on the same line as the key
        //value = "{\n" + od + "\n" + indent + "}";
        // If you prefer { and } to be aligned
        value = "\n" + indent + "{\n" + od + "\n" + indent + "}";
      }
    }
    result += indent + "'" + property + "' : " + value + ",\n";
  }
  return result.replace(/,\n$/, "");
}

function fileExists(path) {
    return GLib.file_test(path, GLib.FileTest.EXISTS)
}
function mkdirP(path) {
    // 493 == rwxr-xr-x
    GLib.mkdir_with_parents(path, 493);
}
function writeToFile(path, content) {
    GLib.file_set_contents(path, content);
}
function readFromFile(path) {
    return GLib.file_get_contents(path)[1];
}
function joinPaths(paths) {
    return paths.join("/");
}

