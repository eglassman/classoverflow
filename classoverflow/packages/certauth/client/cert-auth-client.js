CertAuth = { }

CertAuth.login = function() {
  if (!Meteor.settings || !Meteor.settings.public || !Meteor.settings.public.CertAuthURL) {
    console.log("cert-auth: no CertAuthURL found.\n"
               +"Need to configure settings.json, and run meteor --settings settings.json");
  } else {
    console.log('logging in with certauth package', Meteor.settings.public.CertAuthURL)
    $.ajax(Meteor.settings.public.CertAuthURL, {
      dataType: "jsonp",
      success: sendCertInfoToServer,
      error: function(XMLHttpRequest, textStatus, errorThrown) { 
        console.log("Status: " + textStatus);
        console.log("Error: " + errorThrown); 
      } 
    });
  }
};

function sendCertInfoToServer(encryptedCertInfo) {
  //console.log("encryptedCertInfo", encryptedCertInfo);
  Meteor.call("startCertAuth", encryptedCertInfo, finishLoginWithOnetimePassword);
}

function finishLoginWithOnetimePassword(err, data) {
  if (err) { 
    console.log(err);
    return;
  } 

  //console.log(data); 
  Meteor.loginWithPassword(data.email, data.password,
      function(err) { 
        if (err) console.log(err); 
      }
  );
}
