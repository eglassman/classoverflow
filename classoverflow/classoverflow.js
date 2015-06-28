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
});