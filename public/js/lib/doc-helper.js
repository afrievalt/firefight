$(function () {
   // var tempApplyBidnings = ko.applyBindings;

    jQuery.fn.extend({
        buildTree: function () {
            $('.tree li:has(ul)').addClass('parent_li').find(' > span').attr('title', 'Collapse this branch');
            $('.tree li.parent_li > span').each(function() {
                var children = $(this).parent('li.parent_li').find(' > ul > li');
                children.hide();
                $(this).attr('title', 'Expand this branch').find(' > i').addClass('icon-plus-sign').removeClass('icon-minus-sign');
            });
            $('.tree').on('click', 'li.parent_li > span', function (e) {
                var children = $(this).parent('li.parent_li').find(' > ul > li');
                if (children.is(":visible")) {
                    children.hide('fast');
                    $(this).attr('title', 'Expand this branch').find(' > i').addClass('icon-plus-sign').removeClass('icon-minus-sign');
                } else {
                    children.show('fast');
                    $(this).attr('title', 'Collapse this branch').find(' > i').addClass('icon-minus-sign').removeClass('icon-plus-sign');
                }
                e.stopPropagation();
            });
        }
    });
    $.fn.buildTree();
    
    $("[code-example]").each(codeExample);
    function codeExample() {
        var $this = $(this);
        var target = $this.attr("code-example");
        var codeExample$ = document.getElementById(target);
        if (!codeExample) return;
        var html = codeExample$.innerHTML.replace(/[\<]/g, "&lt;").replace(/[\{]/g, "<span>{</span>");
        $this.html(html); 
    }

    //ko.applyBindings = function () {
    //    tempApplyBidnings.apply(this, arguments);
    //    Firebase.goOffline();
    //};

});