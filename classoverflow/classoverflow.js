Classes = new Meteor.Collection('classes');

if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
    Template.classes.helpers({
        classes: function(){
            return Classes.find().fetch();
        }
  });
    
    //To make this more general, revisit the use of 'this' described here: http://robertdickert.com/blog/2014/05/08/iron-router-first-steps/
    Template.navbar.helpers({
    errorCoords: function(classtitle) {
        var thisclass = Classes.findOne({title:classtitle});
        return thisclass['errorCoords'];
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    //if (! Classes.findOne()){
      Classes.remove({});
       var classes = [
           {title: '6.004', errorCoords: [
      { name: "module" , placeholder: 'Module'},
      { name: "testNum" , placeholder: 'Test Number'}
    ], route: '6004class'},
           {title: '6.005', errorCoords: [
      { name: "package" , placeholder: 'Package'},
      { name: "testName" , placeholder: 'Test Name'}
    ], route: '6005class'}
           ];
          classes.forEach(function(c){Classes.insert(c);})
      //}
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