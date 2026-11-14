// Questions written only for the two Netarhat Paper 1 full mock tests, so the mocks never repeat a quiz question.
// They are kept apart from hindi.mjs, science.mjs and social.mjs on purpose: the quizzes draw distractors from whole
// tables, so adding rows there would change questions that are already live. Same row layouts as those files.
// Written by SchoolDhundo at Class 5 level; not official or previous-year questions.
import { mcq, shuffleFixed } from './core.mjs';

const E = 'EASY', M = 'MEDIUM';

// Science: [topic, difficulty, EN prompt, EN options, HI prompt, HI options, answer index, EN explanation, HI explanation]
export const SCIENCE_MOCK = [
  ['Plants', E, 'Which part of a plant holds it firmly in the soil?', ['Root', 'Leaf', 'Flower', 'Fruit'], 'पौधे का कौन-सा भाग उसे मिट्टी में मज़बूती से पकड़े रहता है?', ['जड़', 'पत्ती', 'फूल', 'फल'], 0, 'Roots anchor the plant in the soil and also absorb water.', 'जड़ें पौधे को मिट्टी में जमाए रखती हैं और पानी भी सोखती हैं।'],
  ['Plants', M, 'Which of these is a root that we eat?', ['Carrot', 'Potato', 'Onion', 'Cabbage'], 'इनमें से कौन-सी खाई जाने वाली जड़ है?', ['गाजर', 'आलू', 'प्याज़', 'पत्तागोभी'], 0, 'The carrot is a root. The potato is a stem, the onion is a bulb of fleshy leaves and cabbage is leaves.', 'गाजर जड़ है। आलू तना है, प्याज़ गूदेदार पत्तियों का शल्ककंद है और पत्तागोभी पत्तियाँ है।'],
  ['Plants', E, 'In which part of a flower are pollen grains made?', ['Stamen', 'Root', 'Leaf', 'Bark'], 'फूल के किस भाग में परागकण बनते हैं?', ['पुंकेसर', 'जड़', 'पत्ती', 'छाल'], 0, 'Pollen grains are made in the anther of the stamen, the male part of the flower.', 'परागकण पुंकेसर के परागकोश में बनते हैं, जो फूल का नर भाग है।'],
  ['Plants', M, 'Which plant grows in water and has broad leaves that float?', ['Lotus', 'Cactus', 'Babool', 'Pine'], 'कौन-सा पौधा पानी में उगता है और उसकी चौड़ी पत्तियाँ तैरती हैं?', ['कमल', 'नागफनी', 'बबूल', 'चीड़'], 0, 'The lotus is an aquatic plant; its broad leaves float on the water.', 'कमल जलीय पौधा है; उसकी चौड़ी पत्तियाँ पानी पर तैरती हैं।'],
  ['Plants', M, 'Big plants that live for many years and have a hard, woody trunk are called:', ['Trees', 'Herbs', 'Creepers', 'Grasses'], 'कई वर्षों तक जीवित रहने वाले, कठोर लकड़ी के तने वाले बड़े पौधे क्या कहलाते हैं?', ['वृक्ष', 'शाक', 'लताएँ', 'घास'], 0, 'Trees are tall plants with a thick, woody trunk.', 'वृक्ष मोटे, लकड़ी वाले तने के ऊँचे पौधे होते हैं।'],
  ['Plants', E, 'Oil is taken from the seeds of which plant?', ['Mustard', 'Spinach', 'Sugarcane', 'Potato'], 'किस पौधे के बीजों से तेल निकाला जाता है?', ['सरसों', 'पालक', 'गन्ना', 'आलू'], 0, 'Mustard seeds are pressed to get mustard oil.', 'सरसों के बीजों को पेरकर सरसों का तेल निकाला जाता है।'],

  ['Animals', E, 'Which animal gives us wool?', ['Sheep', 'Cow', 'Horse', 'Hen'], 'हमें ऊन कौन-सा जानवर देता है?', ['भेड़', 'गाय', 'घोड़ा', 'मुर्गी'], 0, 'Wool comes from the fleece (hair) of sheep.', 'ऊन भेड़ के बालों से मिलता है।'],
  ['Animals', M, 'Which animal catches insects with its long, sticky tongue?', ['Frog', 'Cow', 'Goat', 'Rabbit'], 'कौन-सा जीव अपनी लंबी, चिपचिपी जीभ से कीड़े पकड़ता है?', ['मेंढक', 'गाय', 'बकरी', 'खरगोश'], 0, 'A frog flicks out its sticky tongue to catch insects; the others eat plants.', 'मेंढक अपनी चिपचिपी जीभ से कीड़े पकड़ता है; बाक़ी जीव पौधे खाते हैं।'],
  ['Animals', E, 'Which of these animals eats only the flesh of other animals?', ['Lion', 'Cow', 'Deer', 'Rabbit'], 'इनमें से कौन-सा जानवर केवल दूसरे जानवरों का मांस खाता है?', ['शेर', 'गाय', 'हिरण', 'खरगोश'], 0, 'The lion is a carnivore. Cows, deer and rabbits are herbivores.', 'शेर मांसाहारी है। गाय, हिरण और खरगोश शाकाहारी हैं।'],
  ['Animals', M, 'Which animal has no legs and moves by crawling?', ['Snake', 'Horse', 'Kangaroo', 'Duck'], 'किस जीव के पैर नहीं होते और वह रेंगकर चलता है?', ['साँप', 'घोड़ा', 'कंगारू', 'बत्तख'], 0, 'A snake has no legs; it moves by bending its body and pushing against the ground.', 'साँप के पैर नहीं होते; वह शरीर को मोड़कर और ज़मीन पर दबाव डालकर रेंगता है।'],
  ['Animals', M, 'Whales and dolphins live in water, but they breathe air with their:', ['Lungs', 'Gills', 'Skin', 'Feathers'], 'व्हेल और डॉल्फ़िन पानी में रहती हैं, पर वे किससे हवा में साँस लेती हैं?', ['फेफड़ों से', 'गलफड़ों से', 'त्वचा से', 'पंखों से'], 0, 'Whales and dolphins are mammals; they come to the surface to breathe air with lungs.', 'व्हेल और डॉल्फ़िन स्तनधारी हैं; वे सतह पर आकर फेफड़ों से हवा में साँस लेती हैं।'],
  ['Animals', M, 'Which bird weaves a hanging nest out of grass?', ['Weaver bird', 'Crow', 'Pigeon', 'Peacock'], 'कौन-सा पक्षी घास बुनकर लटकता हुआ घोंसला बनाता है?', ['बया', 'कौआ', 'कबूतर', 'मोर'], 0, 'The weaver bird (baya) weaves a hanging nest from strips of grass.', 'बया पक्षी घास की पत्तियों से लटकता हुआ घोंसला बुनता है।'],

  ['Human body', E, 'Which organ helps us to think and remember?', ['Brain', 'Heart', 'Lungs', 'Stomach'], 'कौन-सा अंग हमें सोचने और याद रखने में मदद करता है?', ['मस्तिष्क', 'हृदय', 'फेफड़े', 'आमाशय'], 0, 'The brain controls thinking, memory and the working of the body.', 'मस्तिष्क सोचने, याद रखने और शरीर के कामों को नियंत्रित करता है।'],
  ['Human body', M, 'Which part of the blood carries oxygen around the body?', ['Red blood cells', 'White blood cells', 'Platelets', 'Water in the blood'], 'रक्त का कौन-सा भाग पूरे शरीर में ऑक्सीजन पहुँचाता है?', ['लाल रक्त कणिकाएँ', 'श्वेत रक्त कणिकाएँ', 'प्लेटलेट्स', 'रक्त में उपस्थित पानी'], 0, 'Red blood cells contain haemoglobin, which carries oxygen.', 'लाल रक्त कणिकाओं में हीमोग्लोबिन होता है, जो ऑक्सीजन ले जाता है।'],
  ['Human body', E, 'The framework of bones in our body is called the:', ['Skeleton', 'Muscle', 'Skin', 'Nerve'], 'हमारे शरीर में हड्डियों के ढाँचे को क्या कहते हैं?', ['कंकाल', 'मांसपेशी', 'त्वचा', 'तंत्रिका'], 0, 'The skeleton gives the body its shape and protects organs.', 'कंकाल शरीर को आकार देता है और अंगों की रक्षा करता है।'],
  ['Human body', M, 'Food goes from the mouth to the stomach through the:', ['Food pipe (oesophagus)', 'Windpipe', 'Kidney', 'Lungs'], 'भोजन मुँह से आमाशय तक किससे होकर जाता है?', ['भोजन नली (ग्रासनली)', 'श्वास नली', 'गुर्दा', 'फेफड़े'], 0, 'The food pipe carries swallowed food to the stomach; the windpipe carries air.', 'भोजन नली निगले गए भोजन को आमाशय तक ले जाती है; श्वास नली हवा ले जाती है।'],

  ['Health', E, 'Which disease spreads by drinking dirty water?', ['Cholera', 'Night blindness', 'Goitre', 'Scurvy'], 'गंदा पानी पीने से कौन-सा रोग फैलता है?', ['हैज़ा', 'रतौंधी', 'घेंघा', 'स्कर्वी'], 0, 'Cholera spreads through dirty water. The others are caused by a lack of nutrients.', 'हैज़ा गंदे पानी से फैलता है। बाक़ी रोग पोषक तत्वों की कमी से होते हैं।'],
  ['Health', M, 'Weak and bent bones (rickets) in children are caused by a lack of:', ['Vitamin D', 'Vitamin A', 'Iodine', 'Vitamin C'], 'बच्चों में कमज़ोर और टेढ़ी हड्डियाँ (रिकेट्स) किसकी कमी से होती हैं?', ['विटामिन D', 'विटामिन A', 'आयोडीन', 'विटामिन C'], 0, 'Vitamin D helps the body use calcium to build strong bones.', 'विटामिन D शरीर को कैल्शियम का उपयोग करके मज़बूत हड्डियाँ बनाने में मदद करता है।'],
  ['Health', E, 'Which food is rich in carbohydrates and gives us energy?', ['Rice', 'Fish', 'Egg', 'Paneer'], 'कौन-सा भोजन कार्बोहाइड्रेट से भरपूर है और हमें ऊर्जा देता है?', ['चावल', 'मछली', 'अंडा', 'पनीर'], 0, 'Rice is mostly starch, a carbohydrate. Fish, egg and paneer are rich in protein.', 'चावल में अधिकतर मंड (कार्बोहाइड्रेट) होता है। मछली, अंडा और पनीर प्रोटीन से भरपूर हैं।'],
  ['Health', M, 'Anaemia (too little blood) is caused by a lack of which mineral?', ['Iron', 'Iodine', 'Calcium', 'Sodium'], 'रक्ताल्पता (एनीमिया) किस खनिज की कमी से होती है?', ['लोहा (आयरन)', 'आयोडीन', 'कैल्शियम', 'सोडियम'], 0, 'Iron is needed to make haemoglobin; green leafy vegetables and jaggery contain iron.', 'हीमोग्लोबिन बनाने के लिए लोहा चाहिए; हरी पत्तेदार सब्ज़ियों और गुड़ में लोहा होता है।'],

  ['Matter', E, 'Which of these is a gas?', ['Steam', 'Ice', 'Wood', 'Milk'], 'इनमें से कौन-सी गैस है?', ['भाप', 'बर्फ़', 'लकड़ी', 'दूध'], 0, 'Steam is water in the form of a gas. Ice and wood are solids; milk is a liquid.', 'भाप गैस के रूप में पानी है। बर्फ़ और लकड़ी ठोस हैं; दूध द्रव है।'],
  ['Matter', M, 'A solid changing into a liquid on heating is called:', ['Melting', 'Freezing', 'Condensation', 'Evaporation'], 'गरम करने पर ठोस का द्रव में बदलना क्या कहलाता है?', ['पिघलना', 'जमना', 'संघनन', 'वाष्पन'], 0, 'Ice melting into water is an example of melting.', 'बर्फ़ का पिघलकर पानी बनना पिघलने का उदाहरण है।'],
  ['Matter', M, 'Which of these does NOT dissolve in water?', ['Sand', 'Sugar', 'Salt', 'Glucose'], 'इनमें से कौन-सा पानी में नहीं घुलता?', ['रेत', 'चीनी', 'नमक', 'ग्लूकोज़'], 0, 'Sand settles at the bottom; sugar, salt and glucose dissolve.', 'रेत नीचे बैठ जाती है; चीनी, नमक और ग्लूकोज़ घुल जाते हैं।'],
  ['Matter', M, 'Which of these is a man-made material?', ['Plastic', 'Wood', 'Stone', 'Wool'], 'इनमें से कौन-सा पदार्थ मनुष्य द्वारा बनाया गया है?', ['प्लास्टिक', 'लकड़ी', 'पत्थर', 'ऊन'], 0, 'Plastic is made in factories; wood, stone and wool come from nature.', 'प्लास्टिक कारख़ानों में बनता है; लकड़ी, पत्थर और ऊन प्रकृति से मिलते हैं।'],

  ['Force and energy', E, 'A push or a pull on an object is called a:', ['Force', 'Shadow', 'Sound', 'Colour'], 'किसी वस्तु को धकेलना या खींचना क्या कहलाता है?', ['बल', 'छाया', 'ध्वनि', 'रंग'], 0, 'A force is a push or a pull; it can move, stop or change the shape of an object.', 'धक्का या खिंचाव बल है; यह वस्तु को चला, रोक या उसका आकार बदल सकता है।'],
  ['Force and energy', M, 'A see-saw in a park is an example of a:', ['Lever', 'Pulley', 'Screw', 'Wedge'], 'पार्क का सी-सॉ (ढेंकुली झूला) किसका उदाहरण है?', ['उत्तोलक (लीवर)', 'घिरनी', 'पेंच', 'फान'], 0, 'A see-saw is a bar that turns on a fixed point in the middle, which is a lever.', 'सी-सॉ बीच के एक स्थिर बिंदु पर घूमने वाली छड़ है, यानी उत्तोलक।'],
  ['Force and energy', M, 'Which of these changes electrical energy into light?', ['Electric bulb', 'Electric fan', 'Battery', 'Water pump'], 'इनमें से कौन विद्युत ऊर्जा को प्रकाश में बदलता है?', ['बिजली का बल्ब', 'बिजली का पंखा', 'बैटरी', 'पानी का पंप'], 0, 'A bulb gives light. A fan and a pump turn electricity into motion; a battery stores energy.', 'बल्ब प्रकाश देता है। पंखा और पंप बिजली को गति में बदलते हैं; बैटरी ऊर्जा संचित करती है।'],
  ['Force and energy', E, 'The energy of moving air is used to run:', ['Windmills', 'Solar cookers', 'Candles', 'Coal stoves'], 'बहती हवा की ऊर्जा से क्या चलाया जाता है?', ['पवनचक्की', 'सौर कुकर', 'मोमबत्ती', 'कोयले का चूल्हा'], 0, 'Windmills use wind energy, for example to make electricity or pump water.', 'पवनचक्की पवन ऊर्जा से चलती है, जैसे बिजली बनाने या पानी खींचने के लिए।'],

  ['Light', E, 'Light travels in:', ['Straight lines', 'Circles', 'Zigzag lines only', 'Curved lines only'], 'प्रकाश किस प्रकार चलता है?', ['सीधी रेखाओं में', 'वृत्तों में', 'केवल टेढ़ी-मेढ़ी रेखाओं में', 'केवल वक्र रेखाओं में'], 0, 'Light travels in straight lines, which is why shadows form.', 'प्रकाश सीधी रेखाओं में चलता है, इसी कारण छाया बनती है।'],
  ['Light', M, 'An object through which light cannot pass at all is called:', ['Opaque', 'Transparent', 'Translucent', 'Shiny'], 'जिस वस्तु से प्रकाश बिल्कुल पार न जा सके, उसे क्या कहते हैं?', ['अपारदर्शी', 'पारदर्शी', 'पारभासी', 'चमकीली'], 0, 'Wood and stone are opaque. Glass is transparent; butter paper is translucent.', 'लकड़ी और पत्थर अपारदर्शी हैं। काँच पारदर्शी है; बटर पेपर पारभासी है।'],
  ['Light', M, 'We see our image in a mirror because the mirror:', ['Reflects light', 'Absorbs all light', 'Makes its own light', 'Stops light from moving'], 'हमें दर्पण में अपना प्रतिबिंब क्यों दिखता है? क्योंकि दर्पण:', ['प्रकाश को परावर्तित करता है', 'सारा प्रकाश सोख लेता है', 'स्वयं प्रकाश बनाता है', 'प्रकाश को रोक देता है'], 0, 'A smooth, shiny mirror sends light back (reflection), forming an image.', 'चिकना, चमकीला दर्पण प्रकाश को वापस लौटाता है (परावर्तन), जिससे प्रतिबिंब बनता है।'],

  ['Sound', M, 'Sound travels fastest through:', ['An iron rod', 'Water', 'Air', 'Empty space'], 'ध्वनि सबसे तेज़ किसमें चलती है?', ['लोहे की छड़ में', 'पानी में', 'हवा में', 'ख़ाली स्थान (निर्वात) में'], 0, 'Sound is fastest in solids, slower in liquids, slower still in air, and cannot travel in empty space.', 'ध्वनि ठोस में सबसे तेज़, द्रव में धीमी, हवा में और धीमी चलती है, और निर्वात में नहीं चल सकती।'],
  ['Sound', E, 'A loud, unpleasant sound is called:', ['Noise', 'Music', 'Echo', 'Song'], 'तेज़ और अप्रिय ध्वनि को क्या कहते हैं?', ['शोर', 'संगीत', 'प्रतिध्वनि', 'गीत'], 0, 'Unwanted loud sound is noise; too much of it causes noise pollution.', 'अनचाही तेज़ ध्वनि शोर है; बहुत अधिक शोर ध्वनि प्रदूषण है।'],

  ['Earth and space', E, 'How long does the Earth take to spin once on its axis?', ['About 24 hours', 'About 365 days', 'About 30 days', 'About 7 days'], 'पृथ्वी अपनी धुरी पर एक बार घूमने में कितना समय लेती है?', ['लगभग 24 घंटे', 'लगभग 365 दिन', 'लगभग 30 दिन', 'लगभग 7 दिन'], 0, 'One spin takes about 24 hours and gives us one day and one night.', 'एक चक्कर में लगभग 24 घंटे लगते हैं, जिससे एक दिन और एक रात होती है।'],
  ['Earth and space', M, 'About how long does the Moon take to go once round the Earth?', ['About a month', 'One day', 'One year', 'One week'], 'चंद्रमा पृथ्वी का एक चक्कर लगाने में लगभग कितना समय लेता है?', ['लगभग एक महीना', 'एक दिन', 'एक वर्ष', 'एक सप्ताह'], 0, 'The Moon goes round the Earth in about 27 days, and its phases repeat in about 29½ days: roughly a month.', 'चंद्रमा लगभग 27 दिनों में पृथ्वी का चक्कर लगाता है और उसकी कलाएँ लगभग 29½ दिनों में दोहराती हैं: लगभग एक महीना।'],
  ['Earth and space', E, 'Which planet is third from the Sun?', ['Earth', 'Mars', 'Venus', 'Jupiter'], 'सूर्य से तीसरा ग्रह कौन-सा है?', ['पृथ्वी', 'मंगल', 'शुक्र', 'बृहस्पति'], 0, 'The order is Mercury, Venus, Earth, Mars …', 'क्रम है: बुध, शुक्र, पृथ्वी, मंगल …'],
  ['Earth and space', M, 'Which planet is often called the Earth\'s twin because it is nearly the same size?', ['Venus', 'Mars', 'Saturn', 'Mercury'], 'लगभग समान आकार के कारण किस ग्रह को पृथ्वी की जुड़वाँ बहन कहा जाता है?', ['शुक्र', 'मंगल', 'शनि', 'बुध'], 0, 'Venus is close to the Earth in size and mass.', 'शुक्र आकार और द्रव्यमान में पृथ्वी के लगभग बराबर है।'],

  ['Environment', E, 'World Environment Day is celebrated every year on:', ['5 June', '22 April', '1 May', '14 November'], 'विश्व पर्यावरण दिवस हर वर्ष कब मनाया जाता है?', ['5 जून', '22 अप्रैल', '1 मई', '14 नवंबर'], 0, 'World Environment Day is on 5 June (22 April is Earth Day).', 'विश्व पर्यावरण दिवस 5 जून को है (22 अप्रैल पृथ्वी दिवस है)।'],
  ['Environment', M, 'Which of these makes river water dirty?', ['Throwing garbage into the river', 'Planting trees on its banks', 'Rainwater harvesting', 'Boiling drinking water'], 'इनमें से किससे नदी का पानी गंदा होता है?', ['नदी में कचरा फेंकना', 'किनारों पर पेड़ लगाना', 'वर्षा जल संचयन', 'पीने का पानी उबालना'], 0, 'Garbage and waste thrown into rivers cause water pollution.', 'नदियों में फेंका गया कचरा जल प्रदूषण का कारण है।'],

  ['Water and weather', M, 'Which instrument measures the amount of rain?', ['Rain gauge', 'Thermometer', 'Compass', 'Stethoscope'], 'वर्षा की मात्रा किस यंत्र से मापी जाती है?', ['वर्षामापी', 'थर्मामीटर', 'कम्पास', 'स्टेथोस्कोप'], 0, 'A rain gauge collects rain and shows how many millimetres fell.', 'वर्षामापी वर्षा का पानी इकट्ठा करके बताता है कि कितने मिलीमीटर वर्षा हुई।'],
];

// Social Studies: same layout.
export const SOCIAL_MOCK = [
  ['Jharkhand', M, 'Which is the highest hill of Jharkhand?', ['Parasnath', 'Netarhat', 'Dalma', 'Rajmahal'], 'झारखंड की सबसे ऊँची पहाड़ी कौन-सी है?', ['पारसनाथ', 'नेतरहाट', 'दलमा', 'राजमहल'], 0, 'Parasnath hill in Giridih district, about 1,365 m high, is the highest point of Jharkhand.', 'गिरिडीह ज़िले की पारसनाथ पहाड़ी (लगभग 1,365 मीटर) झारखंड का सबसे ऊँचा स्थान है।'],
  ['Jharkhand', M, 'Dassam Falls is near which city?', ['Ranchi', 'Dumka', 'Deoghar', 'Giridih'], 'दशम जलप्रपात किस शहर के पास है?', ['राँची', 'दुमका', 'देवघर', 'गिरिडीह'], 0, 'Dassam Falls is in Ranchi district, on the Kanchi river.', 'दशम जलप्रपात राँची ज़िले में काँची नदी पर है।'],
  ['Jharkhand', M, 'What is the state bird of Jharkhand?', ['Koel', 'Peacock', 'Parrot', 'Sparrow'], 'झारखंड का राजकीय पक्षी कौन-सा है?', ['कोयल', 'मोर', 'तोता', 'गौरैया'], 0, 'The Asian koel is the state bird of Jharkhand; the peacock is the national bird.', 'कोयल झारखंड का राजकीय पक्षी है; मोर राष्ट्रीय पक्षी है।'],
  ['Jharkhand', M, 'Which river flows past Jamshedpur?', ['Subarnarekha', 'Yamuna', 'Godavari', 'Narmada'], 'जमशेदपुर के पास से कौन-सी नदी बहती है?', ['स्वर्णरेखा', 'यमुना', 'गोदावरी', 'नर्मदा'], 0, 'The Subarnarekha and its tributary the Kharkai meet at Jamshedpur.', 'स्वर्णरेखा और उसकी सहायक खरकई नदी जमशेदपुर में मिलती हैं।'],
  ['Jharkhand', M, 'The Karma festival of Jharkhand is linked with the branch of which tree?', ['Karam', 'Mango', 'Coconut', 'Pine'], 'झारखंड का करमा पर्व किस पेड़ की डाली से जुड़ा है?', ['करम', 'आम', 'नारियल', 'चीड़'], 0, 'In Karma, a branch of the Karam tree is worshipped and people sing and dance around it.', 'करमा में करम पेड़ की डाली की पूजा होती है और लोग उसके चारों ओर गाते-नाचते हैं।'],
  ['Jharkhand', M, 'Sohrai, a festival of Jharkhand, is mainly linked with:', ['Cattle and the harvest', 'Snowfall', 'Sea fishing', 'Desert camels'], 'झारखंड का सोहराय पर्व मुख्य रूप से किससे जुड़ा है?', ['पशुधन और फ़सल', 'बर्फ़बारी', 'समुद्री मछली पकड़ना', 'रेगिस्तानी ऊँट'], 0, 'Sohrai honours cattle after the harvest; houses are decorated with Sohrai wall paintings.', 'सोहराय फ़सल के बाद पशुधन के सम्मान में मनाया जाता है; घरों पर सोहराय चित्रकला बनाई जाती है।'],
  ['Jharkhand', M, 'Which city is the sub-capital (second capital) of Jharkhand?', ['Dumka', 'Dhanbad', 'Bokaro', 'Hazaribagh'], 'झारखंड की उपराजधानी कौन-सा शहर है?', ['दुमका', 'धनबाद', 'बोकारो', 'हज़ारीबाग'], 0, 'Ranchi is the capital and Dumka, in Santhal Pargana, is the sub-capital.', 'राँची राजधानी है और संथाल परगना का दुमका उपराजधानी है।'],
  ['Jharkhand', M, 'How many divisions (pramandal) does Jharkhand have?', ['5', '3', '8', '24'], 'झारखंड में कितने प्रमंडल हैं?', ['5', '3', '8', '24'], 0, 'North Chotanagpur, South Chotanagpur, Kolhan, Palamu and Santhal Pargana. Jharkhand has 24 districts.', 'उत्तरी छोटानागपुर, दक्षिणी छोटानागपुर, कोल्हान, पलामू और संथाल परगना। झारखंड में 24 ज़िले हैं।'],

  ['India: geography', E, 'Which is the smallest state of India by area?', ['Goa', 'Sikkim', 'Tripura', 'Kerala'], 'क्षेत्रफल में भारत का सबसे छोटा राज्य कौन-सा है?', ['गोवा', 'सिक्किम', 'त्रिपुरा', 'केरल'], 0, 'Goa is the smallest state by area; Rajasthan is the largest.', 'क्षेत्रफल में गोवा सबसे छोटा राज्य है; राजस्थान सबसे बड़ा।'],
  ['India: geography', M, 'Which of these rivers flows west into the Arabian Sea?', ['Narmada', 'Ganga', 'Godavari', 'Krishna'], 'इनमें से कौन-सी नदी पश्चिम की ओर बहकर अरब सागर में गिरती है?', ['नर्मदा', 'गंगा', 'गोदावरी', 'कृष्णा'], 0, 'The Narmada flows west to the Arabian Sea; the others flow east to the Bay of Bengal.', 'नर्मदा पश्चिम की ओर अरब सागर में गिरती है; बाक़ी पूर्व की ओर बंगाल की खाड़ी में।'],
  ['India: geography', E, 'Which state is called the "land of five rivers"?', ['Punjab', 'Bihar', 'Kerala', 'Assam'], 'किस राज्य को "पाँच नदियों की भूमि" कहा जाता है?', ['पंजाब', 'बिहार', 'केरल', 'असम'], 0, '"Punjab" means five waters (rivers).', '"पंजाब" का अर्थ है पाँच पानी (नदियाँ)।'],
  ['India: geography', M, 'Chilika, a large lake near the sea, is in which state?', ['Odisha', 'Rajasthan', 'Punjab', 'Haryana'], 'समुद्र के पास स्थित बड़ी चिल्का झील किस राज्य में है?', ['ओडिशा', 'राजस्थान', 'पंजाब', 'हरियाणा'], 0, 'Chilika is a large lagoon on the coast of Odisha.', 'चिल्का ओडिशा के तट पर एक बड़ी लैगून झील है।'],
  ['India: geography', M, 'Which state has the longest coastline in India?', ['Gujarat', 'Goa', 'Kerala', 'West Bengal'], 'भारत में सबसे लंबी तटरेखा किस राज्य की है?', ['गुजरात', 'गोवा', 'केरल', 'पश्चिम बंगाल'], 0, 'Gujarat has the longest coastline of any Indian state.', 'भारत के राज्यों में गुजरात की तटरेखा सबसे लंबी है।'],
  ['India: geography', M, 'Which is the main winter (rabi) crop of Punjab and Haryana?', ['Wheat', 'Tea', 'Coffee', 'Jute'], 'पंजाब और हरियाणा की मुख्य रबी (जाड़े की) फ़सल कौन-सी है?', ['गेहूँ', 'चाय', 'कॉफ़ी', 'जूट'], 0, 'Wheat is sown in winter and harvested in spring.', 'गेहूँ जाड़े में बोया और वसंत में काटा जाता है।'],
  ['India: geography', M, 'Jute is grown mostly in which state?', ['West Bengal', 'Rajasthan', 'Himachal Pradesh', 'Gujarat'], 'जूट मुख्य रूप से किस राज्य में उगाया जाता है?', ['पश्चिम बंगाल', 'राजस्थान', 'हिमाचल प्रदेश', 'गुजरात'], 0, 'Jute needs heat, heavy rain and river soil, found in West Bengal.', 'जूट को गर्मी, अधिक वर्षा और नदी की उपजाऊ मिट्टी चाहिए, जो पश्चिम बंगाल में है।'],
  ['India: geography', E, 'The Andaman and Nicobar Islands lie in the:', ['Bay of Bengal', 'Arabian Sea', 'Red Sea', 'Pacific Ocean'], 'अंडमान और निकोबार द्वीपसमूह कहाँ स्थित हैं?', ['बंगाल की खाड़ी में', 'अरब सागर में', 'लाल सागर में', 'प्रशांत महासागर में'], 0, 'They are in the Bay of Bengal; Lakshadweep is in the Arabian Sea.', 'ये बंगाल की खाड़ी में हैं; लक्षद्वीप अरब सागर में है।'],

  ['Maps and globe', M, 'On a map, what the symbols mean is explained in the:', ['Key (legend)', 'Scale', 'Title', 'Margin'], 'मानचित्र पर चिह्नों का अर्थ कहाँ समझाया जाता है?', ['संकेत-सूची (कुंजी)', 'पैमाना', 'शीर्षक', 'हाशिया'], 0, 'The key, or legend, lists each symbol and what it stands for.', 'संकेत-सूची (कुंजी) में हर चिह्न और उसका अर्थ दिया होता है।'],
  ['Maps and globe', M, 'Lines on a globe that run from the North Pole to the South Pole are called:', ['Longitudes', 'Latitudes', 'The Equator', 'Tropics'], 'ग्लोब पर उत्तरी ध्रुव से दक्षिणी ध्रुव तक जाने वाली रेखाएँ क्या कहलाती हैं?', ['देशांतर रेखाएँ', 'अक्षांश रेखाएँ', 'विषुवत रेखा', 'कर्क-मकर रेखाएँ'], 0, 'Longitudes (meridians) join the poles; latitudes run east–west.', 'देशांतर रेखाएँ ध्रुवों को जोड़ती हैं; अक्षांश रेखाएँ पूर्व–पश्चिम चलती हैं।'],
  ['Maps and globe', E, 'The imaginary line on which the Earth spins, joining the North and South Poles, is its:', ['Axis', 'Equator', 'Orbit', 'Horizon'], 'उत्तरी और दक्षिणी ध्रुव को जोड़ने वाली वह काल्पनिक रेखा, जिस पर पृथ्वी घूमती है, क्या कहलाती है?', ['अक्ष (धुरी)', 'विषुवत रेखा', 'कक्षा', 'क्षितिज'], 0, 'The Earth spins on its axis, which passes through both poles.', 'पृथ्वी अपने अक्ष पर घूमती है, जो दोनों ध्रुवों से होकर जाता है।'],
  ['Maps and globe', M, 'If you face the rising sun in the morning, your back is towards the:', ['West', 'North', 'South', 'East'], 'यदि सुबह आप उगते सूरज की ओर मुँह करके खड़े हों, तो आपकी पीठ किस दिशा में होगी?', ['पश्चिम', 'उत्तर', 'दक्षिण', 'पूर्व'], 0, 'The sun rises in the east, so your back faces the west.', 'सूर्य पूर्व में उगता है, इसलिए पीठ पश्चिम की ओर होगी।'],
  ['Maps and globe', E, 'How many main (cardinal) directions are there?', ['Four', 'Two', 'Six', 'Ten'], 'मुख्य दिशाएँ कितनी होती हैं?', ['चार', 'दो', 'छह', 'दस'], 0, 'North, south, east and west are the four main directions.', 'उत्तर, दक्षिण, पूर्व और पश्चिम चार मुख्य दिशाएँ हैं।'],

  ['History', M, 'Who founded the Maurya Empire?', ['Chandragupta Maurya', 'Ashoka', 'Akbar', 'Harshavardhana'], 'मौर्य साम्राज्य की स्थापना किसने की?', ['चंद्रगुप्त मौर्य', 'अशोक', 'अकबर', 'हर्षवर्धन'], 0, 'Chandragupta Maurya founded the empire; Ashoka was his grandson.', 'चंद्रगुप्त मौर्य ने साम्राज्य की स्थापना की; अशोक उनके पोते थे।'],
  ['History', M, 'Who wrote the Arthashastra?', ['Chanakya (Kautilya)', 'Kalidasa', 'Tulsidas', 'Valmiki'], 'अर्थशास्त्र की रचना किसने की?', ['चाणक्य (कौटिल्य)', 'कालिदास', 'तुलसीदास', 'वाल्मीकि'], 0, 'Chanakya, adviser to Chandragupta Maurya, wrote the Arthashastra on running a state.', 'चंद्रगुप्त मौर्य के सलाहकार चाणक्य ने राज्य चलाने पर अर्थशास्त्र लिखा।'],
  ['History', E, 'Who was the first Mughal emperor of India?', ['Babur', 'Akbar', 'Humayun', 'Aurangzeb'], 'भारत का पहला मुग़ल बादशाह कौन था?', ['बाबर', 'अकबर', 'हुमायूँ', 'औरंगज़ेब'], 0, 'Babur founded Mughal rule after the first battle of Panipat in 1526.', 'बाबर ने 1526 में पानीपत की पहली लड़ाई के बाद मुग़ल शासन की नींव रखी।'],
  ['History', M, 'Who said, "Swaraj is my birthright and I shall have it"?', ['Bal Gangadhar Tilak', 'Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel'], '"स्वराज मेरा जन्मसिद्ध अधिकार है और मैं इसे लेकर रहूँगा", यह किसने कहा?', ['बाल गंगाधर तिलक', 'महात्मा गांधी', 'जवाहरलाल नेहरू', 'सरदार पटेल'], 0, 'Lokmanya Bal Gangadhar Tilak gave this famous call for self-rule.', 'लोकमान्य बाल गंगाधर तिलक ने स्वराज का यह प्रसिद्ध नारा दिया।'],
  ['History', M, 'Mahatma Gandhi\'s Champaran Satyagraha (1917) took place in present-day:', ['Bihar', 'Gujarat', 'Punjab', 'Kerala'], 'महात्मा गांधी का चंपारण सत्याग्रह (1917) आज के किस राज्य में हुआ?', ['बिहार', 'गुजरात', 'पंजाब', 'केरल'], 0, 'Champaran is in Bihar; Gandhiji supported indigo farmers there.', 'चंपारण बिहार में है; वहाँ गांधीजी ने नील किसानों का साथ दिया।'],
  ['History', E, 'Who was the first woman Prime Minister of India?', ['Indira Gandhi', 'Sarojini Naidu', 'Pratibha Patil', 'Sucheta Kripalani'], 'भारत की पहली महिला प्रधानमंत्री कौन थीं?', ['इंदिरा गांधी', 'सरोजिनी नायडू', 'प्रतिभा पाटिल', 'सुचेता कृपलानी'], 0, 'Indira Gandhi became Prime Minister in 1966.', 'इंदिरा गांधी 1966 में प्रधानमंत्री बनीं।'],
  ['History', M, 'Sarojini Naidu, poet and freedom fighter, is known as the:', ['Nightingale of India', 'Iron Man of India', 'Father of the Nation', 'Missile Man of India'], 'कवयित्री और स्वतंत्रता सेनानी सरोजिनी नायडू किस नाम से जानी जाती हैं?', ['भारत कोकिला', 'लौह पुरुष', 'राष्ट्रपिता', 'मिसाइल मैन'], 0, 'Her poems earned her the name "Nightingale of India" (भारत कोकिला).', 'अपनी कविताओं के कारण उन्हें "भारत कोकिला" कहा गया।'],

  ['Our government', M, 'Who is the head of the Republic of India?', ['The President', 'The Prime Minister', 'The Chief Justice', 'The Speaker'], 'भारत गणराज्य का प्रमुख कौन होता है?', ['राष्ट्रपति', 'प्रधानमंत्री', 'मुख्य न्यायाधीश', 'लोकसभा अध्यक्ष'], 0, 'The President is the head of the country; the Prime Minister heads the government.', 'राष्ट्रपति देश के प्रमुख हैं; प्रधानमंत्री सरकार के प्रमुख हैं।'],
  ['Our government', M, 'Members of the Lok Sabha are chosen by:', ['The people, in elections', 'The President alone', 'The judges', 'The Chief Ministers'], 'लोकसभा के सदस्य कौन चुनता है?', ['जनता, चुनाव द्वारा', 'केवल राष्ट्रपति', 'न्यायाधीश', 'मुख्यमंत्री'], 0, 'Voters elect Lok Sabha members, usually every five years.', 'मतदाता लोकसभा सदस्यों को चुनते हैं, सामान्यतः हर पाँच वर्ष में।'],
  ['Our government', E, 'The Governor is the head of a:', ['State', 'Village', 'Country', 'School'], 'राज्यपाल किसका प्रमुख होता है?', ['राज्य का', 'गाँव का', 'देश का', 'विद्यालय का'], 0, 'Each state has a Governor; the Chief Minister leads the state government.', 'हर राज्य का एक राज्यपाल होता है; मुख्यमंत्री राज्य सरकार का नेतृत्व करते हैं।'],
  ['Our government', M, 'In Jharkhand, the officer at the head of a district\'s administration is the:', ['Deputy Commissioner', 'Mukhiya', 'Governor', 'Mayor'], 'झारखंड में किसी ज़िले के प्रशासन का प्रमुख अधिकारी कौन होता है?', ['उपायुक्त (डिप्टी कमिश्नर)', 'मुखिया', 'राज्यपाल', 'महापौर'], 0, 'The Deputy Commissioner (in some states called the District Collector) runs the district.', 'उपायुक्त (कुछ राज्यों में ज़िलाधिकारी या कलेक्टर) ज़िले का प्रशासन चलाते हैं।'],
  ['Our government', M, 'The meeting of all the adult voters of a village panchayat is called the:', ['Gram Sabha', 'Lok Sabha', 'Rajya Sabha', 'Vidhan Sabha'], 'ग्राम पंचायत के सभी वयस्क मतदाताओं की सभा क्या कहलाती है?', ['ग्राम सभा', 'लोकसभा', 'राज्यसभा', 'विधानसभा'], 0, 'The Gram Sabha discusses the work of the panchayat.', 'ग्राम सभा पंचायत के कामों पर चर्चा करती है।'],
  ['Our government', M, 'Laws for a state are made by its:', ['Vidhan Sabha (Legislative Assembly)', 'Gram Sabha', 'Supreme Court', 'Municipal ward'], 'किसी राज्य के लिए क़ानून कौन बनाता है?', ['विधानसभा', 'ग्राम सभा', 'सर्वोच्च न्यायालय', 'नगर वार्ड'], 0, 'The elected Vidhan Sabha makes the state\'s laws; Parliament makes laws for the country.', 'चुनी हुई विधानसभा राज्य के क़ानून बनाती है; संसद देश के क़ानून बनाती है।'],

  ['Our country', E, 'What is India\'s national tree?', ['Banyan', 'Mango', 'Neem', 'Peepal'], 'भारत का राष्ट्रीय वृक्ष कौन-सा है?', ['बरगद', 'आम', 'नीम', 'पीपल'], 0, 'The banyan is the national tree; the mango is the national fruit.', 'बरगद राष्ट्रीय वृक्ष है; आम राष्ट्रीय फल है।'],
  ['Our country', E, 'What is India\'s national fruit?', ['Mango', 'Banana', 'Apple', 'Guava'], 'भारत का राष्ट्रीय फल कौन-सा है?', ['आम', 'केला', 'सेब', 'अमरूद'], 0, 'The mango is India\'s national fruit.', 'आम भारत का राष्ट्रीय फल है।'],
  ['Our country', M, 'Bihu is a festival of which state?', ['Assam', 'Punjab', 'Gujarat', 'Kerala'], 'बिहू किस राज्य का पर्व है?', ['असम', 'पंजाब', 'गुजरात', 'केरल'], 0, 'Bihu marks the seasons of farming in Assam.', 'बिहू असम में खेती के मौसमों का पर्व है।'],
  ['Our country', M, 'Bharatanatyam is a classical dance from:', ['Tamil Nadu', 'Punjab', 'Assam', 'Manipur'], 'भरतनाट्यम किस राज्य का शास्त्रीय नृत्य है?', ['तमिलनाडु', 'पंजाब', 'असम', 'मणिपुर'], 0, 'Bharatanatyam comes from Tamil Nadu; Manipuri comes from Manipur and Sattriya from Assam.', 'भरतनाट्यम तमिलनाडु का है; मणिपुरी मणिपुर का और सत्रीया असम का नृत्य है।'],
  ['Our country', M, 'Which city is called the "Silicon Valley of India" for its computer industry?', ['Bengaluru', 'Jaipur', 'Patna', 'Shimla'], 'कंप्यूटर उद्योग के कारण किस शहर को "भारत की सिलिकॉन वैली" कहा जाता है?', ['बेंगलुरु', 'जयपुर', 'पटना', 'शिमला'], 0, 'Bengaluru is India\'s main centre of computer and software companies.', 'बेंगलुरु भारत में कंप्यूटर और सॉफ़्टवेयर कंपनियों का मुख्य केंद्र है।'],
  ['Our country', M, 'About how long does it take to sing the full national anthem?', ['52 seconds', '5 minutes', '10 seconds', '15 minutes'], 'पूरा राष्ट्रगान गाने में लगभग कितना समय लगता है?', ['52 सेकंड', '5 मिनट', '10 सेकंड', '15 मिनट'], 0, 'The full version of "Jana Gana Mana" takes about 52 seconds.', '"जन गण मन" का पूरा रूप गाने में लगभग 52 सेकंड लगते हैं।'],
];

// Hindi (हिंदी), in Hindi, for the two mocks. Distractors for synonyms and antonyms come from other rows of these
// tables only.
const SYN = [
  ['कमल', 'पंकज'], ['राजा', 'नृप'], ['समुद्र', 'सागर'], ['शरीर', 'देह'], ['बिजली', 'विद्युत'], ['दूध', 'दुग्ध'],
  ['घोड़ा', 'अश्व'], ['हाथी', 'गज'], ['जंगल', 'वन'], ['मुख', 'मुँह'],
];
const ANT = [
  ['उचित', 'अनुचित'], ['गुण', 'दोष'], ['सम्मान', 'अपमान'], ['ठंडा', 'गरम'], ['मीठा', 'कड़वा'], ['नया', 'पुराना'],
  ['पास', 'दूर'], ['जीत', 'हार'], ['बड़ा', 'छोटा'], ['धनी', 'निर्धन'],
];
const PLURAL = [
  ['बच्चा', 'बच्चे', ['बच्चाएँ', 'बच्चें', 'बच्चाओ']], ['तारा', 'तारे', ['ताराएँ', 'तारें', 'तारियाँ']],
  ['रोटी', 'रोटियाँ', ['रोटीयाँ', 'रोटीएँ', 'रोटे']], ['सड़क', 'सड़कें', ['सड़के', 'सड़कियाँ', 'सड़काएँ']],
];
const GENDER = [
  ['बकरा', 'बकरी', ['बकरिन', 'बकरानी', 'बकराइन']], ['दादा', 'दादी', ['दादिन', 'दादानी', 'दादाइन']],
  ['सेवक', 'सेविका', ['सेवकी', 'सेवकनी', 'सेविकी']], ['मामा', 'मामी', ['मामिन', 'मामानी', 'मामाइन']],
];
const IDIOMS = [
  ['आग बबूला होना', 'बहुत क्रोधित होना', ['आग जलाना', 'बबूल का पेड़ लगाना', 'बहुत ठंडा होना']],
  ['नाक में दम करना', 'बहुत परेशान करना', ['नाक साफ़ करना', 'साँस रोकना', 'ज़ुकाम होना']],
  ['हाथ बँटाना', 'काम में सहायता करना', ['हाथ काटना', 'बँटवारा करना', 'ताली बजाना']],
  ['गागर में सागर भरना', 'थोड़े शब्दों में बहुत कुछ कह देना', ['घड़े में पानी भरना', 'समुद्र में नहाना', 'बहुत अधिक बोलना']],
  ['अंगूठा दिखाना', 'साफ़ मना कर देना', ['अंगूठा चूसना', 'चोट दिखाना', 'रास्ता बताना']],
  ['आँखें चुराना', 'सामने आने से कतराना', ['चोरी करना', 'आँखें बंद करके सोना', 'ध्यान से देखना']],
];
const ONE_WORD = [
  ['जो बहुत बोलता हो', 'वाचाल', ['मितभाषी', 'श्रोता', 'लेखक']],
  ['जिसका कोई आकार न हो', 'निराकार', ['साकार', 'अपार', 'अनंत']],
  ['जो दिखाई न दे', 'अदृश्य', ['अद्भुत', 'अनुपम', 'अमर']],
  ['जो आँखों के सामने हो', 'प्रत्यक्ष', ['परोक्ष', 'दूरस्थ', 'अज्ञात']],
];
const SPELLING = [
  ['सही वर्तनी वाला शब्द चुनिए।', ['परीक्षा', 'परिक्षा', 'परिच्छा', 'परीकशा'], 'शुद्ध रूप "परीक्षा" है।'],
  ['सही वर्तनी वाला शब्द चुनिए।', ['अत्यधिक', 'अत्याधिक', 'अतयधिक', 'अत्यधीक'], '"अति + अधिक" से "अत्यधिक" बनता है।'],
];
const PASSAGES = [
  ['nh-m1', 'पेड़ों का महत्त्व', 'पेड़ हमें छाया, फल और लकड़ी देते हैं। वे हवा को शुद्ध करते हैं और वर्षा लाने में सहायता करते हैं। पेड़ों की जड़ें मिट्टी को बाँधकर रखती हैं, जिससे बाढ़ के समय मिट्टी बहती नहीं। इसलिए हमें हर वर्ष कम-से-कम एक पेड़ अवश्य लगाना चाहिए और उसकी देखभाल करनी चाहिए।',
    [['पेड़ों की जड़ें क्या करती हैं?', ['मिट्टी को बाँधकर रखती हैं', 'हवा को गंदा करती हैं', 'वर्षा रोकती हैं', 'बाढ़ लाती हैं'], 'गद्यांश में लिखा है: "पेड़ों की जड़ें मिट्टी को बाँधकर रखती हैं।"'],
      ['गद्यांश हमें क्या करने की सलाह देता है?', ['हर वर्ष एक पेड़ लगाना और उसकी देखभाल करना', 'पुराने पेड़ काटना', 'केवल फल खाना', 'बाढ़ के पानी में खेलना'], 'अंतिम वाक्य में यही सलाह दी गई है।']]],
  ['nh-m2', 'विद्यालय में स्वतंत्रता दिवस', 'पंद्रह अगस्त को हमारे विद्यालय में स्वतंत्रता दिवस धूमधाम से मनाया गया। सुबह प्रधानाध्यापक जी ने झंडा फहराया और सबने मिलकर राष्ट्रगान गाया। इसके बाद बच्चों ने देशभक्ति के गीत गाए और एक नाटक प्रस्तुत किया। अंत में सभी को मिठाइयाँ बाँटी गईं।',
    [['झंडा किसने फहराया?', ['प्रधानाध्यापक जी ने', 'बच्चों ने', 'गाँव के मुखिया ने', 'खेल शिक्षक ने'], 'गद्यांश में लिखा है: "प्रधानाध्यापक जी ने झंडा फहराया।"'],
      ['कार्यक्रम के अंत में क्या हुआ?', ['सभी को मिठाइयाँ बाँटी गईं', 'राष्ट्रगान गाया गया', 'झंडा फहराया गया', 'नाटक प्रस्तुत हुआ'], 'अंतिम वाक्य: "अंत में सभी को मिठाइयाँ बाँटी गईं।"']]],
];

/** 20 Hindi questions for mock `k` (0 or 1), in the same mix as a Hindi quiz. */
export function hindiMockSet(r, k) {
  const section = 'Hindi';
  const qs = [];
  const id = (n) => `hm${k + 1}-${String(n).padStart(2, '0')}`;
  let n = 0;
  for (let i = 0; i < 4; i++) {
    const [w, s] = SYN[k * 4 + i];
    const wrong = SYN.filter((x) => x[0] !== w).map((x) => x[1]);
    const start = (k * 3 + i * 2) % wrong.length;
    qs.push(mcq(r, { id: id(++n), section, topic: 'पर्यायवाची', difficulty: 'EASY', prompt: `"${w}" का पर्यायवाची शब्द कौन-सा है?`,
      correct: s, wrong: [...wrong.slice(start), ...wrong.slice(0, start)], explanation: `"${w}" का पर्यायवाची "${s}" है।` }));
  }
  for (let i = 0; i < 4; i++) {
    const [w, a] = ANT[k * 4 + i];
    const wrong = ANT.filter((x) => x[0] !== w).map((x) => x[1]);
    const start = (k * 5 + i * 3) % wrong.length;
    qs.push(mcq(r, { id: id(++n), section, topic: 'विलोम शब्द', difficulty: 'EASY', prompt: `"${w}" का विलोम शब्द कौन-सा है?`,
      correct: a, wrong: [...wrong.slice(start), ...wrong.slice(0, start)], explanation: `"${w}" का विलोम (उल्टा अर्थ) "${a}" है।` }));
  }
  for (let i = 0; i < 2; i++) {
    const [s, p, w] = PLURAL[k * 2 + i];
    qs.push(mcq(r, { id: id(++n), section, topic: 'वचन', difficulty: 'MEDIUM', prompt: `"${s}" का बहुवचन रूप क्या है?`, correct: p, wrong: w,
      explanation: `"${s}" का बहुवचन "${p}" है।` }));
  }
  for (let i = 0; i < 2; i++) {
    const [m, f, w] = GENDER[k * 2 + i];
    qs.push(mcq(r, { id: id(++n), section, topic: 'लिंग', difficulty: 'EASY', prompt: `"${m}" का स्त्रीलिंग रूप क्या है?`, correct: f, wrong: w,
      explanation: `"${m}" (पुल्लिंग) का स्त्रीलिंग "${f}" है।` }));
  }
  for (let i = 0; i < 3; i++) {
    const [idiom, meaning, w] = IDIOMS[k * 3 + i];
    qs.push(mcq(r, { id: id(++n), section, topic: 'मुहावरे', difficulty: 'MEDIUM', prompt: `मुहावरे "${idiom}" का अर्थ क्या है?`, correct: meaning, wrong: w,
      explanation: `"${idiom}" का अर्थ है "${meaning}"।` }));
  }
  for (let i = 0; i < 2; i++) {
    const [phrase, word, w] = ONE_WORD[k * 2 + i];
    qs.push(mcq(r, { id: id(++n), section, topic: 'वाक्यांश के लिए एक शब्द', difficulty: 'MEDIUM', prompt: `"${phrase}" — इसके लिए एक शब्द क्या है?`, correct: word, wrong: w,
      explanation: `"${phrase}" के लिए एक शब्द "${word}" है।` }));
  }
  const [sp, opts, why] = SPELLING[k];
  qs.push(shuffleFixed(r, { id: id(++n), section, topic: 'वर्तनी', difficulty: 'MEDIUM', prompt: sp, options: opts, answer: 0, explanation: why }));
  const [pid, title, text, pqs] = PASSAGES[k];
  for (const [p, o, why2] of pqs) {
    qs.push({ ...shuffleFixed(r, { id: id(++n), section, topic: 'अपठित गद्यांश', difficulty: 'EASY', prompt: p, options: o, answer: 0, explanation: why2 }), passageId: pid });
  }
  return { questions: qs, passages: [{ id: pid, title, text }] };
}
