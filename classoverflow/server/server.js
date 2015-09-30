//PRIVATE COLLECTIONS ONLY ON SERVER
Log = new Mongo.Collection("log");
SiteUsers = new Mongo.Collection("siteusers");

//COLLECTIONS TO BE PUBLISHED TO CLIENT
Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

//COLLECTIONS actually published to client
Meteor.publish("classes", function () {
    return Classes.find();
});
Meteor.publish("errors", function () {
    return Errors.find();
});
Meteor.publish("hints", function () {
    return Hints.find();
});


requested = function(errorId) {
    //console.log('this is a placeholder'); //#todo--make this actually check
    var siteUser = SiteUsers.findOne({ userId: Meteor.userId() }));
    if (siteUser['requestedErrors'].indexOf(errorId) >= 0) {
        return true;
    } else {
        return false;
    }
    
};
upvoted = function(hintId) {
    //console.log('this is a placeholder'); //#todo--make this actually check
    //console.log(Hints.findOne({ _id: hintId }));
    var siteUser = SiteUsers.findOne({ userId: Meteor.userId() }));
    if (siteUser['upvotedHints'].indexOf(hintId) >= 0) {
        return true;
    } else {
        return false;
    }
    
};




Meteor.methods({

    addError: function(theclass,errorCoords) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        var candidateError = errorCoords; //{};

        candidateError['class'] = theclass;
        candidateError['requests'] = 0;
        candidateError['createdAt'] = new Date();
        candidateError['owner'] = Meteor.userId(); // _id of logged in user
        //candidateError['requesters'] = [];

        Errors.insert(candidateError);
    },
    addHint: function (theclass,errorId,hintText) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }
        var hintObj = {};
        hintObj['hint'] = hintText;
        hintObj['errorId'] = errorId;
        hintObj['createdAt'] = new Date();
        hintObj['owner'] = Meteor.userId();
        //hintObj['username'] = Meteor.user().username;
        hintObj['class'] = theclass;
        hintObj['upvotes'] = 0;
        //hintObj['upvoters'] = [];


        var insertedHint = Hints.insert(hintObj);

        logObj = {};
        logObj['owner'] = hintObj['owner'];
        //logObj['username'] = Meteor.user().username;
        logObj['action'] = 'add';
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
            var siteUser = SiteUsers.findOne({ userId: Meteor.userId() }));

            logObj = {};

            if (!requested(errorId)) {
                delta = 1;
                logObj['action'] = 'request';
                siteUser['requestedErrors'].push(errorId);
            } else {
                delta = -1;
                logObj['action'] = 'unrequest';
                siteUser['requestedErrors'] = _.without(siteUser['requestedErrors'],errorId);
            }
            Errors.update({ _id: errorId },{$inc: {requests: delta}});

            logObj['owner'] = Meteor.userId();
            //logObj['username'] = Meteor.user().username;
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
            var siteUser = SiteUsers.findOne({ userId: Meteor.userId() }));
            

            logObj = {};

            if (!upvoted(hintId)) {
                delta = 1;
                logObj['action'] = 'upvote';
                siteUser['upvotedHints'].push(hintId);
            } else {
                delta = -1;
                logObj['action'] = 'downvote';
                siteUser['upvotedHints'] = _.without(siteUser['upvotedHints'],hintId);
            }
            Hints.update({ _id: hintId },{$inc: {upvotes: delta}});


            logObj['owner'] = Meteor.userId();
            //logObj['username'] = Meteor.user().username;
            logObj['object'] = hintId;
            logObj['createdAt'] = new Date();
            logObj['class'] = theclass;
            Log.insert(logObj);
        }

    }

});

Accounts.onLogin(function(user){
    //console.log(Meteor.userId())
    console.log('logged in',user.user._id )
    Log.insert({'userId': user.user._id, 'loggedInAt': new Date()})
    SiteUsers.insert({
        'email': Meteor.user().emails[0], 
        'userId': Meteor.userId(), 
        'loggedInAt': new Date(),
        'upvotedHints': [],
        'requestedErrors': [],
    })
});

Accounts.onLoginFailure(function(){
    //console.log(Meteor.userId())
    Log.insert({'loggedInFailedAt': new Date()})
});

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