//PRIVATE COLLECTIONS ONLY ON SERVER
Log = new Mongo.Collection("log");

//COLLECTIONS TO BE PUBLISHED TO CLIENT
Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

//COLLECTIONS being published to client
Meteor.publish("classes", function () {
    return Classes.find();
});
Meteor.publish("errors", function () {
    return Errors.find();
});
Meteor.publish("hints", function () {
    return Hints.find();
});


//PASSWORD FOR STUDENT ID AUTHENTICATED USERS
var edxpass = '071a0f58e44494a90dbc5844c480586c';


//CLASS-SPECIFIC INFO
var classDict = {}

classDict['6.004'] = {}
classDict['6.004']['lab'] = {'label':'Lab Number','type':'int'}
classDict['6.004']['module'] = {'label':'Module','type':'string'}
classDict['6.004']['testNum'] = {'label':'Test Number','type':'int'}

classDict['6.005'] = {}
classDict['6.005']['ps'] = {'label':'Problem Set','type':'int'}
classDict['6.005']['file'] = {'label':'File Name','type':'string'}
classDict['6.005']['line'] = {'label':'Line Number','type':'int'}

classDict['61b'] = {}
classDict['61b']['branch'] = {'label':'Branch','type':'int'}
classDict['61b']['testGroup'] = {'label':'Test Group Name','type':'string'}
classDict['61b']['testNum'] = {'label':'Test Number','type':'int'}


//LOGGING FUNCTIONS
function logThis(classtitle,user,action,receivingObject,createdAt){
    var logObj = {}; //initialize

    logObj['classtitle'] = classtitle;
    logObj['user'] = user;
    logObj['action'] = action;
    logObj['receivingObject'] = receivingObject;
    logObj['createdAt'] = createdAt;

    Log.insert(logObj,function (err, result) {
        //assert.equal(err, null);
        console.log("log insertion:",err,result);
    });
}


//BOOLEAN FUNCTIONS ABOUT USER'S PAST ACTIONS
//did the user request this error?
requested = function(errorId) {
    var requestedErrors = Meteor.user().profile['requestedErrors'];
    if (requestedErrors.indexOf(errorId) >= 0) {return true;} else {return false;}
};
//did the user upvote this hint?
upvoted = function(hintId) {
    var upvotedHints = Meteor.user().profile['upvotedHints'];
    if (upvotedHints.indexOf(hintId) >= 0) { return true;} else {return false;}
};




Meteor.methods({

    addError: function(classtitle,errorCoords) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        var candidateError = errorCoords; 

        candidateError['class'] = classtitle;
        candidateError['requests'] = 0;
        candidateError['createdAt'] = new Date();
        candidateError['owner'] = Meteor.userId(); 

        Errors.insert(candidateError,function (err, result) {
            //assert.equal(err, null);
            console.log("error insertion: ",err,result);
            logThis(classtitle,Meteor.userId(),'addError',result,new Date());
        });

    },
    addHint: function (theclass,errorId,hintText) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        //todo: check if text is right type, appropriate size #sanitization
        if (typeof hintText !== 'string') {
            throw new Meteor.Error('hint-is-no-string')
        }
        if (typeof hintText === 'string' && hintText.length > 1000) {
            throw new Meteor.Error('string-too-long'); 
               //todo: tell the user why its not getting added
        }

        var hintObj = {};
        hintObj['hint'] = hintText;
        hintObj['errorId'] = errorId;
        hintObj['createdAt'] = new Date();
        hintObj['owner'] = Meteor.userId();
        hintObj['class'] = theclass;
        hintObj['upvotes'] = 0;

        var insertedHint = Hints.insert(hintObj);

        logObj = {};
        logObj['owner'] = hintObj['owner'];
        logObj['action'] = 'addHint';
        logObj['object'] = insertedHint;
        logObj['createdAt'] = hintObj['createdAt']
        logObj['class'] = hintObj['class'];
        Log.insert(logObj);

    },
    toggleRequest: function (theclass,errorId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); //I think this is already handled on the client side? redundant there? or here?
        }
        else {

            var delta = 0;
            var requestedErrors = Meteor.user().profile['requestedErrors'];

            logObj = {};

            if (!requested(errorId)) {
                console.log('request this error:',errorId)
                delta = 1;
                logObj['action'] = 'request';
                var updated_requestedErrors = requestedErrors.concat(errorId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.requestedErrors": updated_requestedErrors }} );
                console.log('new user profile',Meteor.user().profile)
            } else {
                console.log('unrequest this error:',errorId)
                delta = -1;
                logObj['action'] = 'unrequest';
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.requestedErrors": _.without(requestedErrors,errorId) }} );
                console.log('new user profile',Meteor.user().profile)
            }
            Errors.update({ _id: errorId },{$inc: {requests: delta}});

            logObj['owner'] = Meteor.userId();
            logObj['object'] = errorId;
            logObj['createdAt'] = new Date();
            logObj['class'] = theclass;
            Log.insert(logObj);
        }

    },
    toggleUpvote: function (theclass,hintId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }
        else {

            var delta = 0;
            var upvotedHints = Meteor.user().profile['upvotedHints'];
            console.log('upvotedHints', upvotedHints)

            logObj = {};

            if (!upvoted(hintId)) {
                console.log('upvote this hint:',hintId)
                delta = 1;
                logObj['action'] = 'upvote';
                //Meteor.user().profile['upvotedHints'].push(hintId);
                var updated_upvotedHints = upvotedHints.concat(hintId);
                console.log('upvotedHints update', updated_upvotedHints)
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": updated_upvotedHints }} );
                console.log('new user profile',Meteor.user().profile)
            } else {
                console.log('downvote this hint:',hintId)
                delta = -1;
                logObj['action'] = 'downvote';
                //Meteor.user().profile['upvotedHints'] = _.without(upvotedHints,hintId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": _.without(upvotedHints,hintId) }} );
                
                console.log('new user profile',Meteor.user().profile)
            }
            Hints.update({ _id: hintId },{$inc: {upvotes: delta}});


            logObj['owner'] = Meteor.userId();
            logObj['object'] = hintId;
            logObj['createdAt'] = new Date();
            logObj['class'] = theclass;
            Log.insert(logObj);
        }
    },
    'loginAsEdxStudent': function(edxstudentID) {
        var edxUserName = 'edx'+edxstudentID;
        var user = Accounts.findUserByUsername(edxUserName);
        if (!user) {
            Accounts.createUser({username: edxUserName,password:edxpass,profile:{
                'isEdxUser':true
            }});
        }
        return {username: edxUserName, password:edxpass}
    }
});

Accounts.onLogin(function(user){
    console.log('logged in',user.user._id )
    Log.insert({'userId': user.user._id, 'loggedInAt': new Date()})
});


Accounts.onCreateUser(function(options, user) {
    if (options.profile) {
        user.profile = options.profile;
    } else {
        user.profile = {};
    }

    user.profile.upvotedHints = []; 
    user.profile.requestedErrors = [];

    return user;
});

Meteor.startup(function () {
    Classes.remove({});

    for (var classtitle in classDict) {

        errorCoords = []

        for (var errorCoord in classDict[classtitle]) {
            errorCoords.push({
                'name': errorCoord,
                'label': classDict[classtitle][errorCoord]['label'],
                'type': classDict[classtitle][errorCoord]['type']
            })
        }

        Classes.insert({
            'classtitle': classtitle,
            'route': '/class/'+classtitle,
            'errorCoords': errorCoords
        },function (err, result) {
            //assert.equal(err, null);
            console.log("class insertion: ",err,result);
        })
    }
        
});
