'use strict';
var app = angular.module('chat', ['ngRoute', 'ui.bootstrap',"angucomplete"]);

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '../views/misc/login.ejs',
        controller: 'loginCtrl'
      }).
      when('/main', {
        templateUrl: '../views/main.ejs',
        controller: 'mainCtrl'
      }).
      when('/create', {
        templateUrl: '../views/create.ejs',
        controller: 'createCtrl'
      }).
      when('/chat', {
        templateUrl: '../views/chat.ejs',
        controller: 'chatCtrl'
      }).
      when('/login', {
        templateUrl: '../views/misc/login.ejs',
        controller: 'loginCtrl'
      }).
      otherwise({
        redirectTo: '/404'
      });
  }]);