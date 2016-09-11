$(function () {
    var tempApplyBidnings = ko.applyBindings;
    ko.applyBindings = function () {
        tempApplyBidnings.apply(this, arguments);
        Firebase.goOffline();
    };
});