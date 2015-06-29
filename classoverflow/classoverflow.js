Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");
SiteUsers = new Mongo.Collection("siteusers");
Feedback = new Mongo.Collection("feedback");
Log = new Mongo.Collection("log");

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
        //if (! Classes.findOne()){
        Classes.remove({});
        var classes = [
            {
                classtitle: '6.004',
                errorCoords: [
                    {
                        name: "module",
                        placeholder: 'Module'
                    },
                    {
                        name: "testNum",
                        placeholder: 'Test Number'
                    }
    ],
                route: '/class/6.004'
            },
            {
                classtitle: '6.005',
                errorCoords: [
                    {
                        name: "package",
                        placeholder: 'Package'
                    },
                    {
                        name: "testName",
                        placeholder: 'Test Name'
                    }
    ],
                route: '/class/6.005'
            }
           ];
        classes.forEach(function (c) {
                Classes.insert(c);
            })
            //}
    });
}

Router.map(function () {
    this.route('about'); // By default, path = '/about', template = 'about'
    this.route('/', function () {
        this.render('classes');
    });
    this.route('/class/:classtitle', function () {
        //console.log(this.params.classtitle);
        var theclass = Classes.findOne({
            classtitle: this.params.classtitle
        });
        //console.log(theclass);
        this.render('navbar', {
            data: theclass
        });
    });
});

if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
    
    Template.registerHelper('errorCoords',function(title){
        //console.log(title)
        if (title) {
            Session.set('class', title);
            var thisclass = Classes.findOne({
                classtitle: title
            });
            //console.log(thisclass);
            return thisclass['errorCoords'];
        } else {
            console.log('no title supplied');
        }
    });
    
    Template.classes.helpers({
        classes: function () {
            return Classes.find().fetch();
        }
    });
    Template.navbar.events({
        "submit .errorCoords-form": function (event) {
            console.log(event)
            console.log(Session.get('class'));
            console.log(event.target[0].name)
            console.log(event.target.length);
            var candidateError = {};
            candidateError['class'] = Session.get('class');
            for (i = 0; i < event.target.length-1; i++) { //-1 so that i don't consider the submit button too.
                console.log(event.target[i].name);
                console.log(event.target[i].value);
                if (!event.target[i].value) {
                    alert('Please provide a value for all form fields.');
                    break;
                } else {
                    var coordVal = isNaN(parseInt(event.target[i].value)) ? event.target[i].value : parseInt(event.target[i].value);
                    candidateError[event.target[i].name] = coordVal;
                }
            }
            console.log(candidateError);
            console.log('error coords submission attempt by', Meteor.userId());
            
            registeredError = Errors.findOne(candidateError);
            if (!registeredError) {
                console.log('not registered yet!')
                if (Meteor.userId()) {
                    candidateError['createdAt'] = new Date();
                    candidateError['owner'] = Meteor.userId(); // _id of logged in user
                    candidateError['username'] = Meteor.user().username; // username of logged in user
                    Errors.insert(candidateError);
                } else {
                    alert('This error is not yet in our system. Please sign in so you can add it.');
                }
            }
            return false
        }
    });
}