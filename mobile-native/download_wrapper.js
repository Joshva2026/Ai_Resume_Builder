
const https = require('https');
const fs = require('fs');
const path = require('path');

const wrapperDir = path.join(__dirname, 'gradle', 'wrapper');
if (!fs.existsSync(wrapperDir)) fs.mkdirSync(wrapperDir, { recursive: true });

const file = fs.createWriteStream(path.join(wrapperDir, 'gradle-wrapper.jar'));
https.get("https://raw.githubusercontent.com/gradle/gradle/v8.2.1/gradle/wrapper/gradle-wrapper.jar", function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();  // close() is async, call cb after close completes.
    console.log("Wrapper downloaded.");
  });
}).on('error', function(err) {
  fs.unlink(path.join(wrapperDir, 'gradle-wrapper.jar'));
  console.error("Error downloading wrapper", err);
});

fs.writeFileSync(path.join(wrapperDir, 'gradle-wrapper.properties'), 
`distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2.1-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);
