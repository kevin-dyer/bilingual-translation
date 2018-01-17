const fs = require('fs');
const speech = require('@google-cloud/speech');
const Translate = require('@google-cloud/translate');

const express = require('express');
const http = require('http');
const util = require('util');
const bodyParser = require('body-parser');

const projectId = 'aiyvoice-191321'


const app = express();
const server = http.createServer(app);
const jsonParser = bodyParser.json({limit: '5mb'})

app.use(bodyParser.raw({ type: 'audio/wav', limit: '50mb' }));


// Creates a client
const client = new speech.SpeechClient({
	projectId
});
const translate = new Translate({
  projectId
});


const filename = '/Users/kdyer/python/voice-recorder/audio_files/audio_1.wav'
const sampleRateHertz = 16000
const encoding = 'LINEAR16'
const languageCode = 'en-US'
const languageCode2 = 'it-IT'
const confidenceThreshold = 0.93


//TODO: put behind api that includes base64 audio to translate
const config = {
  encoding: encoding,
  // sampleRateHertz: sampleRateHertz,
  languageCode: languageCode,
};
const config2 = {
  encoding: encoding,
  // sampleRateHertz: sampleRateHertz,
  languageCode: languageCode2,
};
// const audio = {
//   content: fs.readFileSync(filename).toString('base64'),
// };


app.get('/', (req, res) => {
  res.status(200);
  res.json({message: "Im Alive!"})
});


//api
app.post('/translate_audio', jsonParser, (req, res) => {
	let alt1 //first alternative from promises1 to cloud speech
	let alt2
	let confidence1
	let confidence2
	let hasTranslated = false
	let hasResponded = false

	if (!req || !req.body) return res.sendStatus(400)

	const audio = {
		content: req.body.toString('base64')
	}

	const request = {
	  config: config,
	  audio,
	};
	const request2 = {
	  config: config2,
	  audio,
	};

	console.log("starting promise1")

	const promise1 = client
	  .recognize(request)
	  .then(data => {
	    const response = data[0];
	    const transcription = response.results
	      .map(result => result.alternatives[0].transcript)
	      .join('\n');
	    alt1 = response.results[0] &&
	    	response.results[0].alternatives &&
	    	response.results[0].alternatives[0]

	    //TODO: replace with alt1.confidence
	    confidence1 = alt1 && alt1.confidence
	    console.log(`Promise 1 Transcription: `, transcription);
	    console.log("confidence1: ", confidence1)

	    //if promise1 has returned first and is high confidence, accept right away
	    if (alt1 && !alt2 && confidence1 > confidenceThreshold && !hasTranslated) {
	    	console.log("calling translateText on promise1 case 1")
	    	hasTranslated = true

	    	return translateText({
	    		text: alt1.transcript,
	    		sourceLang: 'en',
	    		targetLang: 'it'
	    	})
	    } else if (alt1 && alt2 && !hasTranslated) {
	    	//call translate if both promises has returned
				let sourceLang = confidence1 > confidence2
					? 'en'
					: 'it'
				let targetLang = confidence1 > confidence2
					? 'it'
					: 'en'
				let text = confidence1 > confidence2
					? alt1.transcript
					: alt2.transcript

				hasTranslated = true

				console.log("calling translateText on promise1 case 2")
				return translateText({
	    		text,
	    		sourceLang,
	    		targetLang
	    	})
	    }
	  })
	  .then(translation => {
	  	if (translation && !hasResponded) {
	  		hasResponded = true
	  		res.status(200);
			  res.json({text: translation});
	  	}
	  })
	  .catch(err => {
	    console.error('ERROR:', err);
	    if (!hasResponded) {
	    	hasResponded = true
	    	res.status(500);
				res.json({error: 'bad translation'});
	    }
	  });


	console.log("starting promise2")
	const promise2 = client
	  .recognize(request2)
	  .then(data => {
	    const response = data[0];
	    //TODO: replace alt.transcript with transcription
	    const transcription = response.results
	      .map(result => result.alternatives[0].transcript)
	      .join('\n');
	    alt2 = response.results[0] &&
	    	response.results[0].alternatives &&
	    	response.results[0].alternatives[0]

	    //TODO: replace with alt1.confidence
	    confidence2 = alt2 && alt2.confidence
	    console.log(`Promise 2 Transcription: `, transcription);
	    console.log("confidence2: ", confidence2)


	    //if promise1 has returned first and is high confidence, accept right away
	    if (alt2 && !alt1 && confidence2 > confidenceThreshold && !hasTranslated) {
	    	hasTranslated = true

	    	console.log("calling translateText on promise2 case 1")
	    	return translateText({
	    		text: alt2.transcript,
	    		sourceLang: 'it',
	    		targetLang: 'en'
	    	})
	    } else if (alt1 && alt2 && !hasTranslated) {
	    	//call translate if both promises has returned
				let sourceLang = confidence1 > confidence2
					? 'en'
					: 'it'
				let targetLang = confidence1 > confidence2
					? 'it'
					: 'en'
				let text = confidence1 > confidence2
					? alt1.transcript
					: alt2.transcript

				hasTranslated = true

				console.log("calling translateText on promise2 case 2")
				return translateText({
	    		text,
	    		sourceLang,
	    		targetLang
	    	})
	    }
	  })
	  .then(translation => {
	  	if (translation && !hasResponded) {
	  		hasResponded = true
	  		res.status(400);
			  res.json({text: translation});
	  	}
	  })
	  .catch(err => {
	    console.error('ERROR:', err);
	    if (!hasResponded) {
	    	hasResponded = true
	    	res.status(500);
				res.json({error: 'bad translation'});
	    }
	  });

})

function translateText({text, sourceLang, targetLang}) {
	console.log("targetLang: ", targetLang, ", sourceLang: ", sourceLang, ", translateText: ", text)

	return translate
		.translate(text, targetLang)
		.then(results => {
			const translation = results[0];

			console.log(`Translation: ${translation}`);
			return translation;
		})
		.catch(err => {
			console.error('ERROR:', err);
			return err;
		});
}

server.listen(8080, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(`Example app listening at http://${host}:${port}`);
});