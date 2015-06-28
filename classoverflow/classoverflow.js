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
    Template.navbar.helpers({
    errorCoords: function(title) {
        var thisclass = Classes.findOne({classtitle: title });
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
           {classtitle: '6.004', errorCoords: [
      { name: "module" , placeholder: 'Module'},
      { name: "testNum" , placeholder: 'Test Number'}
    ], route: '/class/6.004'},
           {classtitle: '6.005', errorCoords: [
      { name: "package" , placeholder: 'Package'},
      { name: "testName" , placeholder: 'Test Name'}
    ], route: '/class/6.005'}
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
  this.route('/class/:classtitle', function () { 
    console.log(this.params.classtitle);
    var theclass = Classes.findOne({classtitle: this.params.classtitle});
    console.log(theclass);
    this.render('navbar',{data: theclass});
  });
});