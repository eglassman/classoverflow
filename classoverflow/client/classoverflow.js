//SUBSCRIBING TO COLLECTIONS SHARED BY SERVER
Classes = new Meteor.Collection("classes");
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

//Meteor.subscribe("classes");
// Meteor.subscribe("errors");
// Meteor.subscribe("hints");

//LOGIN HELPER
loginAsEdxStudent = function(edxstudentID) {
    Meteor.call('loginAsEdxStudent',edxstudentID, function(error,result){
        if (error) {
            console.log('error on login as edx student',error);
        } else {
            Meteor.loginWithPassword(result.username,result.password,function(error){
                if (error) {
                    console.log('error logging in with password',error);
                }
            });
        }
    });
}

Meteor.startup(function () {
    //Deploy edX version without settings.json
    if (Meteor.settings.public.CertAuthURL) {
        CertAuth.login();
        Session.set('certAuthEnabled',true);
    }
}); 




//ROUTER, obviously
// Router.route('/',function(){
//     subscriptions: function() {
//         //this.subscribe('items');
//         // add the subscription to the waitlist
//         this.subscribe('classes').wait();
//     },
//     action: function () {
//         // render all templates and regions for this route
//         this.render('classes');
//     }
// });

Router.map(function(){
    this.route('/', function(){
        subscriptions: function() {
            //this.subscribe('items');
            // add the subscription to the waitlist
            this.subscribe('classes').wait();
        },
        action: function(){
            this.render('classes');
        }
    });
});

// Router.map(function () {
//     //this.route('about'); // By default, path = '/about', template = 'about'
//     // this.route('/', function () {
//     //     this.render('classes');
//     // });
//     this.route('/class/:classtitle', function(){
//         this.render('classpage');
//     });
//     this.route('/class/:classtitle/assignment/:assignment_name', function () {
//         var classtitle = this.params.classtitle; 
//         var assignment_name = this.params.assignment_name; 
//         this.render('classpage', {
//             data: function () {
//               return Posts.findOne({_id: this.params._id});
//             }
//         });
// });
    // this.route('/class/:classtitle', {
    //     template: 'classpage',
    //     waitOn: function(){
    //         var classtitle = this.params.classtitle;
    //         return [Meteor.subscribe('classes'),
    //                 Meteor.subscribe('errors',classtitle),
    //                 Meteor.subscribe('hints',classtitle)];
    //     },
    //     data: function () {
    //         //find or login with student id
    //         if (!Meteor.user() && this.params.query.student_id) {
    //             loginAsEdxStudent(this.params.query.student_id);
    //         }
    //         return this.params
    //     }
    // });
//});



if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: 'EMAIL_ONLY', //"USERNAME_ONLY" restrictCreationByEmailDomain: 'school.edu',
        forceEmailLowercase: true
    });
    
    Template.registerHelper('errorCoords',function(){
        var title = Session.get('class');
        if (title) {
            var thisclass = Classes.findOne({
                classtitle: title
            });
            return thisclass['errorCoords'];
        } else {
            console.log('no title supplied');
        }
    });
    Template.registerHelper('errorCoordsForAnError',function(){
        var curError = this;
        var title = Session.get('class');
        var coordVals = [];
        if (title) {
            var thisclass = Classes.findOne({
                classtitle: title
            });
            thisclass['errorCoords'].forEach(function(ec){
                coordVals.push({val: curError[ec['name']]});
            });                
            return coordVals;
        } else {
            console.log('no title supplied');
        }
    });
    Template.registerHelper('certAuthEnabled',function(){
        return Session.get('certAuthEnabled');
    });
    
    Template.classes.helpers({
        classes: function () {
            return Classes.find().fetch();
        }
    });
    Template.errorTable.helpers({
        errors: function () {
            var title = Session.get('class');
            var coordsSortObj = {}
            var thisclass = Classes.findOne({
                classtitle: title
            });
            
            thisclass['errorCoords'].forEach(function(ec){
                //console.log(ec);
                coordsSortObj[ec['name']] = 1;
            });
            //console.log(coordsSortObj)
            return Errors.find({class: Session.get('class')},{sort: coordsSortObj}).fetch();
        }
    });
    Template.error.helpers({
        hintsHelper: function () {
            return Hints.find({errorId:this._id}, {sort: {upvotes: -1, _id: 1}}).fetch();
        },
        ifRequested: function () {
            var errorId = this._id;
            if (Meteor.user().profile['followedErrors'].indexOf(errorId) >= 0) {
                return true
            } else {
                return false
            }
        }
    });
    Template.error.events({
        "submit .new-hint-entry": function(event) {
            console.log(event)
            var hintText = event.target[0].value;
            var errorId = this._id;
            
            event.preventDefault();
            
            if ( $.trim( hintText ) == '' ) { // Check that it's not all whitespace
                return false;
            } else {

                if (Meteor.userId()) {

                    Meteor.call('addHint',Session.get('class'),errorId,hintText,function(error,result){
                        if (error) {
                            console.log('error in Meteor.addHint call',error) //log failure to add hint
                        } else {
                            event.target[0].value = ''; //clear the hint field on success
                        }
                        
                    });

                } else {
                    //alert('Please sign in so you can add this hint.'); 
                    $('#mySignInModal').modal('show');
                }
            }
            return false;
        },
        "click .follow": function (event) {

            if (Meteor.userId()) {
                Meteor.call('toggleFollow', Session.get('class'), this._id);
            } else {
                $('#mySignInModal').modal('show');
            }
            return false;
        }
    });
    Template.hint.helpers({
        ifUpvoted: function () {
            var hintId = this._id;
            if (Meteor.user().profile['upvotedHints'].indexOf(hintId) >= 0) {
                return true
            } else {
                return false
            }
        }
    });
    Template.hint.events({
        "click .upvote": function(event){

            if (Meteor.userId()) {

                var hintId = this._id;
                Meteor.call('toggleUpvote',Session.get('class'),hintId);

            } else {
                //alert('Please sign in so you can upvote this hint.');
                $('#mySignInModal').modal('show');
            }
            return false;
        }
    });
    
    Template.errorCoord.onRendered(function () {
        console.log('error rendered')
        Session.set('errorCoordsRendered',1+Session.get('errorCoordsRendered'));
        if (Session.get('submitQ') && Session.get('errorCoordsRendered')==Session.get('numErrorCoords')) {
            console.log('submit the sucker!')
            $('#find-add-error-btn').click();
            Session.set('submitQ',false)
        }
    });
    Template.navbar.helpers({
        errorCoords: function() {
            console.log('navbar errorCoords')
            var title = Session.get('class');
            if (title) {
                var thisclass = Classes.findOne({
                    classtitle: title
                });
                var submitQ = true; //just the initialization

                Session.set('errorCoordsRendered',0);
                for (var ec in thisclass['errorCoords']) {
                    var coordval = Session.get(thisclass['errorCoords'][ec]['name']);
                    thisclass['errorCoords'][ec]['coordvalue'] = coordval;
                    if (coordval==undefined) {
                        submitQ = false;
                    }
                }
                Session.set('submitQ',submitQ);
                //console.log('finished errorCoords')
                //console.log(Session.get('submitQ'))
                return thisclass['errorCoords'];
            } else {
                console.log('no title supplied');
            }
        }
    });
    
    Template.navbar.events({
        "submit .errorCoords-form": function (event) {
            event.preventDefault();

            var candidateErrorCoords = {};
            for (i = 0; i < event.target.length-1; i++) { //-1 so that i don't consider the submit button too.

                if (!event.target[i].value) {
                    alert('Please provide a value for all form fields.');
                    break;
                } else {
                    var coordVal = isNaN(parseInt(event.target[i].value)) ? event.target[i].value : parseInt(event.target[i].value);
                    candidateErrorCoords[event.target[i].name] = coordVal;

                }
            }

            console.log('candidateErrorCoords',candidateErrorCoords);
            registeredError = Errors.findOne(candidateErrorCoords);
            console.log('registeredError',registeredError)
            if (!registeredError) {
                console.log(Meteor.user())
                if (Meteor.userId()) {
                    
                    Meteor.call('addError',Session.get('class'),candidateErrorCoords,function(error,result){
                        //console.log(error,result);
                        if (error) {
                            console.log('error during addError', error)
                        } else {
                            myScrollIntoView(result);
                        }
                    });
                    //$('#'+insertedError).css("background-color","gray");
                    //console.log($('#'+insertedError).text())
                    //console.log($('#'+insertedError).css("background-color"))
                } else {
                    //alert('This error is not yet in our system. Please sign in so you can add it.');
                    $('#mySignInModal').modal('show');
                }
            } else {
                myScrollIntoView(registeredError._id); 
            }
            
            return false;
        },
        "click .feedback": function (event) {
            console.log('feedback clicked')
        },
        "click .instructions": function (event) {
            console.log('instructions clicked')
        }
    });
}