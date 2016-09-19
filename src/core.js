import ko from 'knockout'
import Firebase from 'firebase'
import mapping from 'knockout-mapping'
import punches from 'knockout-punches'
import jQuery from 'jquery'
import setupDocumentationPage from './doc-helper.js'
import setupKoExtenders from './ko-extenders.js'
import _ from './utility.js'
import getExtentions from './extentions.js'
let $ = jQuery;

$("script[data-doc-help]").each(()=>{
    setupDocumentationPage()
})

var ff = window.ff || {};
ff.vm = ff.vm || { _selected: [] };
ff.nextId = 0;

(function () {
    let extend = getExtentions(ff);
    if (!setRoot() && ko.punches) return;
    ko.punches.interpolationMarkup.enable();

    
    ff.fb.on('value', function (data) {
        var property;
        var val = data.val() || {};
        setOrUpdateViewModel(ff.vm, val);
        
        applyBindingsOnce();
    });

    function setOrUpdateViewModel(vm, json, path) {
        path = path || [];
        var property;
        for (property in json) {
            if (json.hasOwnProperty(property)) {
                if (vm.hasOwnProperty(property)) {
                    vm[property](getValue());
                } else {
                    vm[property] = ko.observable(getValue()).extend({ path: path, save: property });
                }
            }
        }
        return vm;
        function getValue() {
            var value = json[property];
            var newPath;
            if (typeof value !== "object") {
                return value;
            }
            newPath = path.slice();
            newPath.push(property);
            return setOrUpdateViewModel({}, value, newPath);
        }
    }

    function setRoot() {
        var fbName;
        var type;
        var rootAtr;
        ff.$root = $('[ff-root],[ff-connect]');
        if (ff.$root.length !== 1) return false;
        fbName = ff.$root.attr('ff-connect') || ff.$root.attr('ff-root');
        ff.options = {
            connectionType: ff.$root.attr('atr-connectionType'),
            allowAnonymous: ff.$root.attr('atr-allowAnonymous'),
            setupDocumentationPage: ff.$root.attr('atr-docHelp')
        };
        ff.fb = new Firebase("https://" + fbName + ".firebaseio.com");
        setupKoExtenders(ff.fb);
        rootAtr = ff.$root.attr('atr-root');
        if (rootAtr) {
            ff.fb = ff.fb.child(rootAtr);
        }
        return true;
    }

    function applyBindingsOnce() {
        console.log("in applyBindingsOnce");
        setupHash();
        extendVmFromFields();
        proccessComputedObservables();

        if (ff.options.connectionType === 'offline') {
            console.log("Going offline");
            Firebase.goOffline();
        }
        
        if(ff.options.setupDocumentationPage){
            setupDocumentationPage();
        }

        ko.applyBindings(ff.vm);

        ff.$root
            .removeClass("loading")
            .addClass("ready")
            .find("div.loading").remove();
        applyBindingsOnce = function () { };
    }

    function setupHash() {
        ff.vm._hash = ko.observable(location.hash);
        ff.vm._hash.subscribe(hashChanged);
        function hashChanged(newHash) {
            if (newHash !== location.hash) {
                location.hash = newHash;
            }
        }
        window.onhashchange = locationHashChanged;
        function locationHashChanged() {
            ff.vm._hash(location.hash);
        }


        window.onhashchange = locationHashChanged;
    }

    function proccessComputedObservables() {
        var list = ff.computedObservables;
        var key;
        for (key in list) {
            if (list.hasOwnProperty(key)) {
                ff.vm["$" + key + "$"] = ko.computed(list[key], ff.vm);
            }
        }
    }

    function extendVmFromFields() {
        //use textInput, check         
        ff.$root.find("input,select,textarea,[ff-select],[ff-toggle],[ff-class],[ff-set],[ff-count],[ff-push],[ff-foreach],[ff-visible],[ff-submit],[ff-login],[ff-with],[ff-hide],[ff-delete],[ff-populate],[ff-src],[ff-sort],[ff-visible]").each(function (i, elm) {
            var $elm = $(elm);
            // ReSharper disable once UnusedLocals
            var tokens = $elm.ffInit(extend);
            tokens = $elm.ffVmSetup(ff.vm, tokens); //todo: pass in vm context
            $elm.data("_ffTokens", tokens);
            $elm.ffAddDataBind(tokens);
        });
    }

    
})();

//usefull for debugging 
window.ko = ko;
window.ff = ff;
