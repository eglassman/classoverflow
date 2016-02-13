Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");


addErrorCallback = function(err, result){
    console.log('addError',err, result)
    if (err['error']=='not-authorized') {
        $('#mySignInModal').modal('show');
        //alert('We are sorry, but that is not a valid error.')
    } else if (err['error']) {
        $('#unknownModal').modal('show');
    }
}


Meteor.startup(function () {

    //Deploy edX version without settings.json
    if (Meteor.settings.public.CertAuthURL) {
        CertAuth.login();
        Session.set('certAuthEnabled',true);
    }
    
}); 

Accounts.onLogin(function(){
    console.log('logged in, checking admin status')
    Meteor.call('isAdmin',Meteor.user(),function (error, result) {
        Session.set('isAdmin',result);
    });
});

Accounts.ui.config({
    passwordSignupFields: 'EMAIL_ONLY', //"USERNAME_ONLY" restrictCreationByEmailDomain: 'school.edu',
    forceEmailLowercase: true
});

Template.registerHelper('log',function(){
    console.log('template logging',this);
});
Template.registerHelper('isAdmin',function(){
    return Session.get('isAdmin');
});


Template.registerHelper('errorCoordsForAnError',function(){
    var curError = this;
    var title = Session.get('class');
    var coordVals = [];
    if (title) {
        var thisclass = Classes.findOne({
            classtitle: title
        });
        var route = '/class/'+encodeURIComponent(title);
        thisclass['errorCoords'].forEach(function(ec,ind){
            var field_name_first = 'coord'+ind.toString()+'first';
            route = route + '/' + encodeURIComponent(curError[ec['name']]);
            coordVals.push({
                val: curError[ec['name']], 
                placeholder: ec['placeholder'], 
                first: curError[field_name_first],
                route: route
            });
        });
        var lastCoord = coordVals[coordVals.length-1];
        lastCoord['last'] = true;
        coordVals[coordVals.length-1] = lastCoord;             
        return coordVals;
    } else {
        console.log('no title supplied');
    }
});
Template.registerHelper('certAuthEnabled',function(){
    return Session.get('certAuthEnabled');
});

Template.registerHelper('islevel',function(level,levelnumber){
    return level==levelnumber
});

Template.mainpage.helpers({
    class_entries: function () {
        return Classes.find().fetch();
    }
});

Template.error_row.helpers({
    hintsHelper: function () {
        return Hints.find({errorId:this._id}, {sort: {upvotes: -1, _id: 1}}).fetch();
    },
    ifRequested: function () {
        var errorId = this._id;
        if (Meteor.user()){
            if (Meteor.user().profile['requestedErrors'].indexOf(errorId) >= 0) {
                return true;
            } 
        }
        return false;
    }
});
Template.error_row.events({
    "click .delete-error": function(event){
        console.log('i want to delete',this)
        var errorId = this._id;
        Meteor.call('deleteError',errorId);
    }
})

Template.addErrorBtn.events({
    "click .add-error": function(event){
        console.log('add-error button clicked',event)

        if (Meteor.userId()){
            $('#addErrorModal').modal('show');
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    },
    "click .cannot-find-error": function(event){
        console.log("click .cannot-find-error")
        $('#cannotFindErrorModal').modal('show');
        Meteor.call('logBtnClick','.cannot-find-error')
    }
});

Template.addHintModal.events({
    "click .submit-hint": function(event){
        //event.preventDefault();
        console.log('.submit-hint clicked', event)
        console.log('event.target',event.target)
        var errorId = $(event.target).data('error-id');
        var hintText = $('#hint-text-for-'+errorId).val();
        console.log(hintText)

        $(event.target).prop('disabled',true);

        Meteor.call('addHint',Session.get('class'),errorId,hintText,function(error){
            $(event.target).prop('disabled',false);
            if (error) {
                $('#addhintfeedback').text('Hint rejected. May be too short or too long. Please try again.')
                console.log('error in Meteor.addHint call',error) 
            } else {
                $('#hint-text-for-'+errorId).val('');
                $('#addHintModal-'+errorId).modal('hide');
            }
            
        });

        return false
    },
    "shown.bs.modal .addHintModalClass": function(event){
        $('.addhintfeedback').text('');
    }
});
Template.errorTable.events({
    "click .add-hint": function(event){
        if (Meteor.userId()){
            var errorId = $(event.target).data('error-id');
            $('#addHintModal-'+errorId).modal('show');
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    },
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
                $('#mySignInModal').modal('show');
            }
        }
        return false;
    },
    "click .request": function (event) {

        if (Meteor.userId()) {
            Meteor.call('toggleRequest', Session.get('class'), this._id);
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    },
    "click .no-errors-add-error": function (event){
        console.log("click .no-errors-add-error",event.target)
        
        event.preventDefault();

        var candidateErrorCoords = {};

        var title = Session.get('class');
        var thisclass = Classes.findOne({
            classtitle: title
        });
        candidateErrorCoords[thisclass['errorCoords'][0]['name']] = $(event.target).data('assignment');
        candidateErrorCoords[thisclass['errorCoords'][1]['name']] = $(event.target).data('testgroup');
        candidateErrorCoords[thisclass['errorCoords'][2]['name']] = $(event.target).data('testnum');

        Meteor.call('addError',Session.get('class'),candidateErrorCoords,addErrorCallback);
    }
});
Template.hint.helpers({
    ifUpvoted: function () {
        var hintId = this._id;
        if (Meteor.user()){
            if (Meteor.user().profile['upvotedHints'].indexOf(hintId) >= 0) {
                return true;
            }
        }
        return false;
    }
});
Template.hint.events({
    "click .upvote": function(event){
        if (Meteor.userId()) {
            var hintId = this._id;
            Meteor.call('toggleUpvote',Session.get('class'),hintId);
        } else {
            $('#mySignInModal').modal('show');
        }
        return false;
    },
    "click .delete-hint": function(event){
        console.log('i want to delete',this)
        var hintId = this._id;
        Meteor.call('deleteHint',hintId);
    }
});

Template.errorCoord.onRendered(function () {
    Session.set('errorCoordsRendered',1+Session.get('errorCoordsRendered'));
    if (Session.get('submitQ') && Session.get('errorCoordsRendered')==Session.get('numErrorCoords')) {
        $('#find-add-error-btn').click();
        Session.set('submitQ',false)
    }
});


