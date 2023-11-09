const functions = require('@google-cloud/functions-framework');
const { Schema, default: mongoose } = require('mongoose');
// For Node.js
var TurndownService = require('turndown')

const turndownService = new TurndownService();
const leetcodeURL = "https://leetcode.com/graphql";



const questionListQuery = (totalnum) => `
{
  questionList(categorySlug: "", skip: 0, filters: {}, limit: ${totalnum}) {
  total: totalNum
  questions: data {
    acRate
    difficulty
    freqBar
    frontendQuestionId: questionFrontendId
    isFavor
    paidOnly: isPaidOnly
    status
    title
    content
    titleSlug 
    topicTags {
      name
      id
      slug
    }
    hasSolution
    hasVideoSolution
  }
}
}
`
const questionsSchema = new Schema({
  _id: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  title: {
    type: String,
    index: {
        unique: true,
        dropDups: true
    }
  },
  body: String,
  difficulty: ["EASY", "MEDIUM", "HARD"],
  category: {
    type: String,
    default: ""
  }
});

mongoose.set('setDefaultsOnInsert', true);
functions.http('leetcode', async (req, res) => {

  const totalNum = await fetch(leetcodeURL, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: questionListQuery(1)
    })
  })
  

  const mgdb = await mongoose.connect(process.env.MONGO_URL);
  const Question = mgdb.model("Question", questionsSchema, "Question");
  
  const tm = await totalNum.json();
  const actualNum = tm.data.questionList.total;
  const questionList = await fetch(leetcodeURL, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: questionListQuery(actualNum)
    })
  });
  let nameMap = new Map();
  // update the data
  const result = await questionList.json();
  const questionListObject = result.data.questionList.questions;
  questionListObject.forEach(element => {
    nameMap.set(element.title, nameMap.get(element.title) ?? 0 + 1);
  });
  const resultMap = questionListObject.filter(d => d.content !== null && nameMap.get(d.title) < 2).map((data) => {
    return {
      difficulty: data.difficulty,
      title: data.title,
      titleSlug: data.titleSlug,
      content: turndownService.turndown(data.content)
    }
  });
  await Question.collection.bulkWrite(
    resultMap.map((data) => {
      return {
        'updateOne': {
          'filter': {
            'id': data.titleSlug
          },
          'update': {
            '$set': {
              title: data.title,
              body: data.content,
              difficulty: data.difficulty.toUpperCase(),
              updatedAt: new Date(),
            },
            '$setOnInsert': {   
              _id: data.titleSlug,
              createdAt: new Date(),
              category: "",
            }
          },
          'upsert': true
        },
      }
    })
  ).catch((e) => {
    res.json({
      message: "Failed to update db",
    })
    res.end();
  });
  // todo: perform the repository update here
  const responseObj = {
    data: resultMap
  };
  res.json({
    message: "Success"
  });
  
})