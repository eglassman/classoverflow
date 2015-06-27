if (Meteor.isClient) {
    Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});
    Template.classes.helpers({
    classes: [
      { text: "6.004" , route: 'class6004'},
      { text: "Class 2" }
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
  this.route('class6004', {
    data: function () {return true} //{return Articles.find({class: '6.004'})}  //set template data context
  });
});