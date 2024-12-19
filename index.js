const axios = require('axios');

const SLEEP = 10 //秒
const MOUDLE_MAX = 5
const MODULE_SWITCH = false
const CONCURRENT = 5


const 软件工程 = "40000073118"
const 计算机网络工程 = "40000073312"
const 数据库应用技术 = "40000073315"
const 大数据分析与挖掘技术 = "40000073847"
const 习近平新时代中国特色社会主义思想概论 = "40000074393"
const 形势与政策 = "40000073843"
const 多媒体技术基础 = "40000074387"

const MODULE = 形势与政策
//forum:讨论
const FILTER_TYPE = [
  "online_video",
  "page",
  "web_link",
  "material",
  "forum",
]
const cookie = 'HWWAFSESID=7d0e71a5117f5eb8388; HWWAFSESTIME=1734601744749; Hm_lvt_c3f009f814f701e8fad8a17f9682ec79=1732783243,1734601751; HMACCOUNT=A03DC7FE80506895; BENSESSCC_TAG=V2-40000000001-174c1df9-c6fc-4ce6-b8ed-ebc9f8994803.NDAwMDA5MDQ3ODY.1734688561851.KNujlsaWC0ZG37oyq4S1JBua8Fc; Hm_lpvt_c3f009f814f701e8fad8a17f9682ec79=1734602229; session=V2-40000000001-174c1df9-c6fc-4ce6-b8ed-ebc9f8994803.NDAwMDA5MDQ3ODY.1734688629281.qIx6_jfw9X2SOnXJCqEmxEchV2k'
const instance = axios.create({
  baseURL: 'https://lms.ouchn.cn',
  headers: {
    'Cookie': cookie
  }
})

function sleep(ms) {
  return new Promise((resolve => setTimeout(resolve, ms)))
}

async function read(item, params) {
  const url = `/api/course/activities-read/${item.id}`

  if (item.type === 'forum') {
    const detailUrl = `/api/activities/${item.id}`
    const detailRes = await instance.get(detailUrl)
    const category_id = detailRes.data.topic_category_id
    const listUrl = `/api/forum/categories/${category_id}?conditions=%7B%7D&fields=id,title,created_by(id,name,nickname,comment,avatar_big_url,user_no),group_id,created_at,updated_at,content,read_replies(reply_id),reply_count,unread_reply_count,like_count,current_user_read,current_user_liked,in_common_category,user_role,has_matched_replies,uploads,user_role&page=1`
    const listRes = await instance.get(listUrl, params)
    const topicItem = listRes.data.result.topics[0]
    const readTopicUrl = `/api/topics`
    const replyUrl = `/api/topics/${topicItem.id}/replies`
   await Promise.allSettled([instance.post(readTopicUrl, {
      "title": topicItem.title,
      "content": topicItem.content,
      "uploads": [],
      "category_id": category_id
    }),
     instance.post(replyUrl, {
      "content": listRes.data.result.topics[3].content,
      "uploads": [],
    })])
    console.log('评论成功')
  }
  await instance.post(url, params)
}

function getParams(item) {
  switch (item.type) {
    case "online_video":
      return {
        start: 0,
        end: parseInt(item.uploads[0].videos[0].duration - 1),
      }
    case "page":
      return {}
    case "material":
      return {"upload_id": item.uploads[0].id}
    case "web_link":
      return {}
    default:
      return {}
  }
}

async function runTask(data) {
  console.log('总数::', data.length)
  let success = 0, error = 0;
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const params = getParams(item)

    try {
      await read(item, params)
      console.log(`SUCCESS | ${i + 1}/${data.length} | ${item.title} | ${item.type}`)
      success++
    } catch (e) {
      console.error(`ERROR | ${i + 1}/${data.length} | ${item.title} | ${item.type}\n${e.message}`,)
      await sleep(SLEEP * 1000 * 2)
      error++
    }

    if ((i + 1) % CONCURRENT === 0&&i<data.length-1) {
      await sleep(SLEEP * 1000)
    }
  }
  console.log(`执行结果：总数：${data.length} 成功：${success} 失败${error}`)
}

async function getMoudleActive(moduleId) {
  const res = await instance.get(`/api/course/${MODULE}/all-activities?module_ids=[${moduleId}]&activity_types=learning_activities,exams,classrooms`)

  return res.data.learning_activities
}

async function getMoudles() {
  const res = await instance.get(`/api/courses/${MODULE}/modules`)
  const readedIdList = await getReadedList()
  const task = []

  for (const item of res.data.modules) {
    if (task.length >= MOUDLE_MAX && MODULE_SWITCH) break;
    task.push(getMoudleActive(item.id))
  }
  const moudleActivtList = await Promise.all(task)

  const activeList = moudleActivtList.reduce((prev, cur) => prev.concat(cur), [])

  const taskList = activeList.filter(v => FILTER_TYPE.includes(v.type) && !readedIdList.includes(v.id))


  runTask(taskList)
}

getMoudles()


const getReadedList = async () => {
  try {
    const res = await instance.get(`/api/course/${MODULE}/activity-reads-for-user`)

    return res.data.activity_reads.map(i => i.activity_id)
  } catch (e) {
    console.log('ReadedList获取失败')
  }
}




