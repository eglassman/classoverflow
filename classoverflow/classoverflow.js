Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");
SiteUsers = new Mongo.Collection("siteusers");
Feedback = new Mongo.Collection("feedback");
Log = new Mongo.Collection("log");

/*Accounts.ui.config({
    requestPermissions: {},
    extraSignupFields: [{
        fieldName: 'terms',
        fieldLabel: 'I accept the terms and conditions',
        inputType: 'checkbox',
        visible: true,
        saveToProfile: false,
        validate: function(value, errorFunction) {
            if (value) {
                return true;
            } else {
                errorFunction('You must accept the terms and conditions.');
                return false;
            }
        }
    }]
});*/

/*Accounts.config({sendVerificationEmail: true});

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
});*/

myScrollIntoView = function(result) {
    $('tr').removeClass('highlighted');
    $('#'+result).addClass('highlighted');
    var offset = $('#'+result).offset();
    $('html, body').animate({
        scrollTop: offset.top - 100
    },1000);    
}

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
                        name: "lab",
                        placeholder: 'Lab Number'
                    },
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
                        name: "ps",
                        placeholder: "Problem Set" 
                    },
                    {
                        name: "file",
                        placeholder: 'File Name'
                    },
                    {
                        name: "line",
                        placeholder: 'Line Number'
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
        //console.log(this.params)
        var theclass = Classes.findOne({
            classtitle: this.params.classtitle
        });
        //theclass['query'] = this.params.query;
        for (var q in this.params.query) {
            //console.log(q,this.params.query[q])
            var formparam = q.split('_param')[0];
            console.log(formparam)
            Session.set(formparam,this.params.query[q])
            //theclass[q] = this.params.query[q]
        }
        //console.log(theclass);
        Session.set('class', this.params.classtitle);
        //console.log(theclass)
        Session.set('numErrorCoords',theclass['errorCoords'].length);
        Session.set('submitQ', false);
        console.log(Session)
        this.render('classpage', {
            data: theclass
        });
    });
});

if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
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
            var requests = Log.find({owner:Meteor.userId(), action: 'request',object: this._id}).fetch().length;
            var unrequests = Log.find({owner:Meteor.userId(), action: 'unrequest',object: this._id}).fetch().length;
            var requested = (requests > unrequests) ? true : false;
            return requested
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
                //console.log(hintText,errorId);
                if (Meteor.userId()) {
                    var hintObj = {};
                    hintObj['hint'] = hintText;
                    hintObj['errorId'] = errorId;
                    hintObj['createdAt'] = new Date();
                    hintObj['owner'] = Meteor.userId();
                    hintObj['username'] = Meteor.user().username;
                    hintObj['class'] = Session.get('class');
                    hintObj['upvotes'] = 0;
                    var insertedHint = Hints.insert(hintObj);
                    
                    event.target[0].value = '';
                    logObj = {};
                    logObj['owner'] = Meteor.userId();
                    logObj['username'] = Meteor.user().username;
                    logObj['action'] = 'add';
                    logObj['object'] = insertedHint;
                    logObj['createdAt'] = hintObj['createdAt']
                    logObj['class'] = Session.get('class');
                    Log.insert(logObj);
                } else {
                    alert('Please sign in so you can add this hint.');
                }
            }
            return false;
        },
        "click .request": function (event) {
            var requests = Log.find({owner:Meteor.userId(), action: 'request',object: this._id}).fetch().length;
            var unrequests = Log.find({owner:Meteor.userId(), action: 'unrequest',object: this._id}).fetch().length;
            var requested = (requests > unrequests) ? true : false;
            if (Meteor.userId()) {
                if (!requested) { //if its not already requested
                    Errors.update({ _id: this._id },{$inc: {requests: 1}});
                    logObj = {};
                    logObj['owner'] = Meteor.userId();
                    logObj['username'] = Meteor.user().username;
                    logObj['action'] = 'request';
                    logObj['object'] = this._id;
                    logObj['createdAt'] = new Date();
                    logObj['class'] = Session.get('class');
                    Log.insert(logObj);
                } else {
                    Errors.update({ _id: this._id },{$inc: {requests: -1}});
                    logObj = {};
                    logObj['owner'] = Meteor.userId();
                    logObj['username'] = Meteor.user().username;
                    logObj['action'] = 'unrequest';
                    logObj['object'] = this._id;
                    logObj['createdAt'] = new Date();
                    logObj['class'] = Session.get('class');
                    Log.insert(logObj);
                }
            } else {
                alert('Please sign in so you can request hints for this error.');
            }
            return false;
        }
    });
    Template.hint.helpers({
        ifUpvoted: function () {
            var upvotes = Log.find({owner:Meteor.userId(), action: 'upvote',object: this._id}).fetch().length;
            var downvotes = Log.find({owner:Meteor.userId(), action: 'downvote',object: this._id}).fetch().length;
            var upvoted = (upvotes > downvotes) ? true : false;
            return upvoted
        }
    });
    Template.hint.events({
        "click .upvote": function(event){
            var upvotes = Log.find({owner:Meteor.userId(), action: 'upvote',object: this._id}).fetch().length;
            var downvotes = Log.find({owner:Meteor.userId(), action: 'downvote',object: this._id}).fetch().length;
            //console.log(upvotes,downvotes);
            var upvoted = (upvotes > downvotes) ? true : false;
            if (Meteor.userId()) {
                if (!upvoted) { //if its not already upvoted
                    Hints.update({ _id: this._id },{$inc: {upvotes: 1}});
                    logObj = {};
                    logObj['owner'] = Meteor.userId();
                    logObj['username'] = Meteor.user().username;
                    logObj['action'] = 'upvote';
                    logObj['object'] = this._id;
                    logObj['createdAt'] = new Date();
                    logObj['class'] = Session.get('class');
                    Log.insert(logObj);
                } else {
                    Hints.update({ _id: this._id },{$inc: {upvotes: -1}});
                    logObj = {};
                    logObj['owner'] = Meteor.userId();
                    logObj['username'] = Meteor.user().username;
                    logObj['action'] = 'downvote';
                    logObj['object'] = this._id;
                    logObj['createdAt'] = new Date();
                    logObj['class'] = Session.get('class');
                    Log.insert(logObj);
                }
            } else {
                alert('Please sign in so you can upvote this hint.');
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
                //console.log(thisclass['errorCoords'])
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
            console.log(event)
            event.preventDefault();
            //e.preventDefault();
            //console.log(Session.get('class'));
            //console.log(event.target[0].name)
            //console.log(event.target.length);
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
                    //console.log(coordVal)
                }
            }
            console.log(candidateError);
            //console.log('error coords submission attempt by', Meteor.userId());
            
            registeredError = Errors.findOne(candidateError);
            console.log(registeredError)
            if (!registeredError) {
                //console.log('not registered yet!')
                if (Meteor.userId()) {
                    candidateError['class'] = Session.get('class');
                    candidateError['requests'] = 0;
                    candidateError['createdAt'] = new Date();
                    candidateError['owner'] = Meteor.userId(); // _id of logged in user
                    candidateError['username'] = Meteor.user().username; // username of logged in user
                    
                    Errors.insert(candidateError,function(error,result){
                        console.log(error,result);
                        myScrollIntoView(result);
                    });
                    //$('#'+insertedError).css("background-color","gray");
                    //console.log($('#'+insertedError).text())
                    //console.log($('#'+insertedError).css("background-color"))
                } else {
                    alert('This error is not yet in our system. Please sign in so you can add it.');
                }
            } else {
                myScrollIntoView(registeredError._id); 
            }
            
            return false;
        }
    });
}