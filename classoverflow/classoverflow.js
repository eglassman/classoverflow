if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
    Template.classes.helpers({
    classes: [
      { text: "6.004" , route: '6004class'},
      { text: "6.005" , route: '6005class'}
    ]
  });
    Template.navbar6004.helpers({
    errorCoords: [
      { name: "module" , placeholder: 'Module'},
      { name: "testNum" , placeholder: 'Test Number'}
    ]
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}

Router.map(function () {
  this.route('about');  // By default, path = '/about', template = 'about'
  this.route('classes', {
    path: '/',  //overrides the default '/home'
    //data: function () {return Classes.find()}
  });
  this.route('6004class', {
    data: function () {return true} //{return Articles.find({class: '6.004'})}  //set template data context
  });
  this.route('6005class', {
    data: function () {return true} //{return Articles.find({class: '6.004'})}  //set template data context
  });
  this.route('class', { //I'm not using this route yet, because the composition of a class page is still by hand right now. There is no generic class template--yet!
    path: '/class/:classNum',
    data: function () {return true},
    template: 'class',
  });
});