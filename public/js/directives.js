'use strict';

app.directive('onFocus', function() {
  return {
    restrict: 'A',
    link: function(scope, el, attrs) {
      el.bind('focus', function() {
        scope.$apply(attrs.onFocus);
      });
    }
  };
});

app.directive('onBlur', function() {
  return {
    restrict: 'A',
    link: function(scope, el, attrs) {
      el.bind('blur', function() {
        scope.$apply(attrs.onBlur);
      });
    }
  };
});

app.directive('autoscroll', function () {
  return function(scope, element, attrs) {
    var pos = element[0].parentNode.parentNode.scrollHeight;
    $(element).parent().parent().animate({
      scrollTop : pos
    }, 1000);
  }
});

app.directive("pin", function(){
  return {
    restrict : 'E',
    scope : {
      post : '=post'
    },
    link : function(scope, el, attrs){
      console.log(scope);
      if(scope.post.type == 'link'){
        if(scope.post.url.slice(0,3) == "www"){
          scope.post.url = "http://" + scope.post.url;
        }
        $(el).html("<a target='_blank' href='"+scope.post.url+ "'>"+scope.post.message + '</a>');
      }else if(scope.post.type == 'pin'){
        $(el).html(scope.post.message);
      }else if (scope.post.type == "question"){
        $(el).html("<b>"+scope.post.message+"</p>");
      }
    }
  }
})

