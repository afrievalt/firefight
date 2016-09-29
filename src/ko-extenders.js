import ko from 'knockout'
import mapping from 'knockout-mapping'
import _ from './utility.js'

export default function setupKoExtenders(firebase) {
    //ko extentions
    ko.extenders.save = function(target, options) {
        target.subscribe(function(newVal) {
            var data;
            var update = {};
            var path = "";
            var child = firebase;
            if (target.type === 'array') {
                return;
            }
            //todo:
            //figure out why this is called twice when child value is updated
            if (target.path && target.path.length) {
                path = target.path.join("/");
                child = firebase.child(path);
            }
            data = ko.mapping.toJS(newVal);
            update[options] = data;
            child.update(update);
        });
        return target;
    };

    ko.extenders.path = function(target, options) {
        target.path = options;
        return target;
    };

//is this used?
    ko.extenders.trim = function(target, options) {
        //todo: handle none, left, right trim
        var result = ko.pureComputed({
            read: target,  //always return the original observables value
            write: function(newValue) {
                console.log("in write", newValue);
                target(newValue);
                let current = target();
                let valueToWrite = newValue.trim && newValue.trim();
                if(_.isUndefined(valueToWrite)){
                    return;
                }

                //only write if it changed
                if (valueToWrite !== current) {
                    target(valueToWrite);
                } else if (newValue !== current) {
                    //if the trimed value is the same, but a different value was written, force a notification for the current field
                    target.notifySubscribers(valueToWrite);
                }
            }
        }).extend({ notify: 'always' });

        //initialize with current value to make sure it is rounded appropriately
        result(target());

        //return the new computed observable
        return result;

    };
   
    ko.extenders.type = function(target, options) {
        if (options === 'number') {
            //create a writable computed observable to intercept writes to our observable
            var precision = 0;
            var result = ko.pureComputed({
                read: target,  //always return the original observables value
                write: function(newValue) {
                    var current = target(),
                        roundingMultiplier = Math.pow(10, precision),
                        newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                        valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

                    //only write if it changed
                    if (valueToWrite !== current) {
                        target(valueToWrite);
                    } else {
                        //if the rounded value is the same, but a different value was written, force a notification for the current field
                        if (newValue !== current) {
                            target.notifySubscribers(valueToWrite);
                        }
                    }
                }
            }).extend({ notify: 'always' });

            //initialize with current value to make sure it is rounded appropriately
            result(target());

            //return the new computed observable
            return result;
        }
        target.type = options;
        return target;
    };
}