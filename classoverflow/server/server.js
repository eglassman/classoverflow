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
classDict['6.004']['lab'] = {'label':'Lab Number','type':'number'}
classDict['6.004']['module'] = {'label':'Module','type':'string'}
classDict['6.004']['testNum'] = {'label':'Test Number','type':'number'}

classDict['6.005'] = {}
classDict['6.005']['ps'] = {'label':'Problem Set','type':'number'}
classDict['6.005']['file'] = {'label':'File Name','type':'string'}
classDict['6.005']['line'] = {'label':'Line Number','type':'number'}

classDict['61b'] = {}
classDict['61b']['branch'] = {'label':'Branch','type':'number'}
classDict['61b']['testGroup'] = {'label':'Test Group Name','type':'string'}
classDict['61b']['testNum'] = {'label':'Test Number','type':'number'}


//LOGGING FUNCTIONS
function logThis(classtitle,action,receivingObject){
    var logObj = {}; //initialize

    logObj['classtitle'] = classtitle;
    logObj['user'] = Meteor.userId();
    logObj['action'] = action;
    logObj['receivingObject'] = receivingObject;
    logObj['createdAt'] = new Date();

    Log.insert(logObj,function (err, result) {
        //assert.equal(err, null);
        //console.log("log insertion:",err,result);
        if (err ==null) {console.log('problem adding hints')} 
        else {'log entry added',result}
    });
}


//BOOLEAN TEMPLATE HELPER FUNCTIONS ABOUT USER'S PAST ACTIONS
//did the user follow this error?
followed = function(errorId) {
    var followedErrors = Meteor.user().profile['followedErrors'];
    if (followedErrors.indexOf(errorId) >= 0) {return true;} else {return false;}
};
//did the user upvote this hint?
upvoted = function(hintId) {
    var upvotedHints = Meteor.user().profile['upvotedHints'];
    if (upvotedHints.indexOf(hintId) >= 0) { return true;} else {return false;}
};




Meteor.methods({

    addError: function(classtitle,userErrorCoords) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        //checking input type and size
        for (var errorCoord in classDict[classtitle]) {
            if (typeof userErrorCoords[errorCoord] !== classDict[classtitle][errorCoord]['type']){
                throw new Meteor.Error('not-the-right-type');
            }
            if (typeof userErrorCoords[errorCoord] === 'string' && userErrorCoords[errorCoord].length > 50) {
                throw new Meteor.Error('string-is-too-long'); 
            }
            if (typeof userErrorCoords[errorCoord] === 'number' && (userErrorCoords[errorCoord] > 10000 || userErrorCoords[errorCoord] < 0)) {
                throw new Meteor.Error('number-is-too-large-or-small'); 
            }
        }

        userErrorCoords['classtitle'] = classtitle;
        userErrorCoords['follows'] = 1;
        userErrorCoords['createdAt'] = new Date();
        userErrorCoords['first_follower'] = Meteor.userId();

        Errors.insert(userErrorCoords,function (err, result) {
            //assert.equal(err, null);
            if (err ==null) {console.log('problem adding errors')} 
            else {logThis(classtitle,'addError',result);}
        });

    },
    addHint: function (classtitle,errorId,hintText) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        if (typeof hintText !== 'string') {
            throw new Meteor.Error('hint-is-not-a-string')
        } else {
            if (hintText.length > 1000) {
                throw new Meteor.Error('string-is-too-long'); 
            }
        }

        var hintObj = {};
        hintObj['hint'] = hintText;
        hintObj['errorId'] = errorId;
        hintObj['createdAt'] = new Date();
        hintObj['user'] = Meteor.userId();
        hintObj['classtitle'] = classtitle;
        hintObj['upvotes'] = 0;

        Hints.insert(hintObj,function (err, result) {
            //assert.equal(err, null);
            //console.log("hint insertion: ",err,result);
            if (err ==null) {console.log('problem adding hints')} 
            else {logThis(classtitle,'addHint',result);}
        });

    },
    toggleFollow: function (classtitle,errorId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); //I think this is already handled on the client side? redundant there? or here?
        } else {

            var followedErrors = Meteor.user().profile['followedErrors'];

            var delta = 0;
            var action = '';

            if (!followed(errorId)) {
                delta = 1;
                action = 'follow';
                var updated_followedErrors = followedErrors.concat(errorId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.followedErrors": updated_followedErrors }} );
            } else {
                delta = -1;
                action = 'unfollow';
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.followedErrors": _.without(followedErrors,errorId) }} );
            }

            Errors.update({ _id: errorId },{$inc: {follows: delta}},function(err){
                if (err ==null) {console.log('problem updating error follows')} 
                else {logThis(classtitle,action,errorId)}
            });
        }

    },
    toggleUpvote: function (classtitle,hintId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        } else {

            var upvotedHints = Meteor.user().profile['upvotedHints'];
            
            var delta = 0;
            var action = '';

            if (!upvoted(hintId)) {
                delta = 1;
                action = 'upvote';
                var updated_upvotedHints = upvotedHints.concat(hintId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": updated_upvotedHints }} );
            } else {
                delta = -1;
                action = 'downvote';
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": _.without(upvotedHints,hintId) }} );
            }

            Hints.update({ _id: hintId },{$inc: {upvotes: delta}},function(err){
                if (err ==null) {console.log('problem updating hint upvotes')} 
                else {logThis(classtitle,action,hintId)}
            });
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
    user.profile.followedErrors = [];

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
            if (err ==null) {console.log('problem adding classes')} 
            else {console.log("class insertion: ",result);}
        })
    }
        
});
