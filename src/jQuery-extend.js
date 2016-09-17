import jQuery from 'jquery'
import _ from './utility.js'
let $ = jQuery;

console.log("jQuery-extend.js");

//$ extentions
jQuery.fn.extend({
    hasAttr: function(attr) {
        let $this = $(this); 
        return !_.isUndefined($this.attr(attr))
    },
    reset: function () {
        var $form = this;
        var elm = $form[0];
        elm && elm.reset && elm.reset();
        //$form.find("input:checked").trigger('click'); 
        //$form.trigger("reset");
        //$form.find("input").trigger('change');
    },
    //this function will return an ordered array of attributes starting with ff-
    //if ff-target is in the list, it will be last.    
    ffAttrs: function () {
        var $this = this,
            attrs = $this[0] && $this[0].attributes,
            result = [];
        $(attrs).each(function (i, elm) {
            if (elm.name.substring(0, 3) === "ff-") {
                result.unshift(elm);
            }
        });
        return result;
    },
    ffInit: function (extentions) {
        console.log("ffInit")
        var $this = this;
        var p = parse();
        var node = _.getExtention(extentions, p.name);
        var result;
        if (!node) return;
        $this.data('_ffName', p.name); //todo: deprecate
        result = node.init($this, p.value) || {};
        result.command = node;
        result.$elm = $($this);
        return result;

        //parse returns an object with a name and optional value
        //if node contains an attribute string with ff- name = the string after ff-;  ff-set => name: 'set'
        //                                              & value = the value of attribute;  ff-set="foo=1" => value: 'foo=1'
        //else if tagName is <input> name = the type attribute surronded by []; <input type='number'/> => name: '[number]'
        //else name = tagName <>; <textarea/> => name: '<textarea>'        
        //
        //todo: document specificity ff-, over tag name
        function parse() {
            var attrs = $this[0] && $this[0].attributes,
                result, name,
                type = $this.attr("type"),
                tagName = $this[0] && $this[0].tagName.toLowerCase();
            $(attrs).each(function (i, elm) {
                if (elm.name.substring(0, 3) === "ff-") {
                    name = elm.name.substring(3);
                    result = { name: name, value: elm.value };
                    return;
                }
            });
            if (result) return result;
            if (tagName === 'input') {
                if (type) {
                    type = type.toLowerCase();
                }
                return { name: "[" + type + "]" };
            }
            return { name: "<" + tagName.toLowerCase() + ">" };
        }
    },

    ffVmSetup: function (vm, tokens) {
        console.log("ffVmSetup", vm, tokens)
        var $this = $(this);
        var result = $.extend({}, tokens);
        var child = false;
        var name = $this.data('_ffName'); //todo: deprecate
        //var node = _.getExtention(name);
        var node = result.command;
        var pContext = $this.parent().closest("[ffContext]").attr("ffContext"); //todo: keep looping                
        if (pContext) {
            vm = vm[pContext]();
            child = true;
            result.vm = vm;
        }
        result.child = child;
        if (node) {
            result = node.vmSetup($this, vm, child, result) || result;
        }
        return result;
    },
    ffAddDataBind: function (tokens) {
        console.log("ffAddDataBind", tokens)
        var $this = $(this);
        var result = $.extend({}, tokens);
        var name = $this.data("_ffName"); //todo: deprecate
        //var ext = _.getExtention(name); //todo: deprecate
        if (result.command) {
            result = result.command.addDataBind($this, result) || result;
        }

        //if (ext) {
        //    ext.addDataBind($this, result);
        //}
        return result;
    },

});
