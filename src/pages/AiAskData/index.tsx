import { useModel } from '@@/exports';
import {Card, Col, Collapse, Input, message, Row, Space, Spin, Table} from 'antd';
import React, {useEffect, useRef, useState} from 'react';
import './index.css'
import WebSocketComponent from "@/components/WebSocket";
import {listAiRoleVoByPageUsingPost} from "@/services/hwqbi/aiRoleController";
import {
  LoadingOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  addUserAskSqlHistoryUsingPost,
  addUserChatHistoryUsingPost, getChatByIdUsingPost,
  getUserChatHistoryUsingGet,
  getUserChatRecordUsingPost, getUserSqlChatRecordUsingPost, userChatForSqlUsingPost, userChatWithModelUsingPost
} from "@/services/hwqbi/aiController";
import {ModalForm, ProFormSelect, ProFormText, ProFormTextArea, ProTable} from "@ant-design/pro-components";
import OmsViewMarkdown from "@/components/OmsViewMarkdown";
import {useLocation} from "umi";
import {listUserMySqlDataInfoUsingGet} from "@/services/hwqbi/dataController";
/**
 * 我的图表页面
 * @constructor
 */
const AiAskData: React.FC = () => {
  const initSearchParams = {
    current: 1,
    pageSize: 4,
    sortField: 'createTime',
    sortOrder: 'desc',
  };

  const location = useLocation();

  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  const [createModalOpen, handleModalOpen] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useState<API.AiRoleQueryRequest>({ ...initSearchParams });
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState ?? {};
  // 当前聊天模型
  const [curModel, setCurModel] = useState<API.GetUserChatHistoryVO>();
  const [loading, setLoading] = useState<boolean>(true);
  const [chatHistory, setChatHistory] = useState<API.GetUserChatHistoryVO[]>()
  // 历史记录
  const [chatRecord, setChatRecord] = useState<API.GetUserSQLChatRecordVO[]>([])
  // 添加选项
  const [selectItem, setSelectItem] = useState([])
  // 内容
  const [content, setContent] = useState<string>('')
  // 选项卡
  const[selectIndex, setSelectIndex] = useState<number>(-1)
  // 提交状态
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [curSQL, setCurSQL] = useState<string>('')
  const [result, setResult] = useState<Record<string, any>[]>()
  const [columns, setColumns] = useState()
  const addFormIndex = [
    {
      name: 'dataId',
      required: true,
      label: '数据集',
      message: '数据集不得为空',
      type: 'select',
      selectItem: selectItem
    },
  ];


  // 加载页面数据
  const loadData = async () => {
    console.log(location)
    setLoading(true);
    setSelectItem([])
    // 加载用户数据集
    const userDataRes = await listUserMySqlDataInfoUsingGet()
    if (userDataRes.code === 0) {
      for(const item of userDataRes.data ?? []) {
        const cur = {
          label: item.dataName,
          value: item.id,
        }
        // @ts-ignore
        setSelectItem(result => [...result, cur])
      }
    }

    // 加载历史对话
    const historyRes = await getUserChatHistoryUsingGet();
    if (historyRes.data) {
      console.log(historyRes.data)
      setChatHistory(historyRes.data);
    }
    // 加载用户选择的信息
    if (location.search) {
      const chatId = location.search.substring(1, location.search.length)
      // 请求当前模型
      const param = {
        chatId: chatId
      }
      // @ts-ignore
      const res =  await getChatByIdUsingPost(param)
      if (res.data) {
        setCurModel(res.data)
      }
    }
    // 获取历史信息
    setLoading(false);
  };

  // 加载对话记录
  const loadRecord = async () => {
    const chatRecordParam = {chatId: curModel?.chatId}
    // 加载用户对话历史
    const chatRecordRes = await getUserSqlChatRecordUsingPost(chatRecordParam)
    if (chatRecordRes.data) {
      setChatRecord(chatRecordRes.data)
    }
  }

  // 用户发送信息
  const sendQuestion = async () => {
    if (submitting) {
      return;
    }

    if (content === '') {
      message.error('请输入内容')
      return;
    }
    if(!curModel) {
      message.error('请先选择助手')
      return;
    }

    setSubmitting(true)
    const question = {
      question: content,
      chatId: curModel?.chatId
    }
    setContent('')
    const addItem = {
      chatRole: 0,
      content: content
    }
    setChatRecord(item => [...item, addItem])
    const res = await userChatForSqlUsingPost(question)
    if (res.code !== 0) {
      message.error(res.message)
    }
  }

  const scrollDomRef = useRef<HTMLDivElement>(null);

  // 加载对话记录
  useEffect(() => {
    loadRecord()
  },[curModel])


  let timeoutTimer: number | NodeJS.Timeout | null | undefined = null
  let intervalTimer: number | NodeJS.Timeout | undefined
  const autoScroll = () => {
    if (timeoutTimer) {
      window.clearTimeout(timeoutTimer)
    }
    // 容器高度
    const clientH = scrollDomRef.current && scrollDomRef.current.clientHeight || 0
    // 滚动高度
    const scrollH = scrollDomRef.current && scrollDomRef.current.scrollHeight || 0
    if (intervalTimer) {
      window.clearInterval(intervalTimer)
    }
    // 无滚动
    if (scrollH === clientH) return
    //
    if (scrollDomRef.current) {
      const distance = scrollH - clientH
      console.log(distance)
      scrollDomRef.current.scrollTop = scrollH
    }
  }

  // 渲染websocket消息
  useEffect(() => {
    if (submitting) { // 在submitting中，不断追加
      const arr = chatRecord
      console.log(result)
      arr[arr.length - 1].res = result
      setChatRecord(arr)
      autoScroll()
    }
  }, [result])

  // 渲染websocket消息
  useEffect(() => {
    if (submitting) { // 在submitting中，不断追加
      const arr = chatRecord
      console.log(result)
      arr[arr.length - 1].columns = columns
      setChatRecord(arr)
      autoScroll()
    }
  }, [columns])

  // 渲染websocket消息
  useEffect(() => {
    if (submitting) { // 在submitting中，不断追加
      const arr = chatRecord
      arr[arr.length - 1].sql = curSQL
      setChatRecord(arr)
      autoScroll()
    }
  }, [curSQL])



  // 建立连接
  useEffect(() => {
    loadData();
    const handleMessage = (event:any) => {
      // 处理收到的消息
      console.log('收到消息：', event.data);
      const res = JSON.parse(event.data)
      if (res.type === 'start') { //会话开始
        // 增加系统回答框
        const addItem : API.GetUserSQLChatRecordVO = {
          chatRole: 1,
          res: [],
          columns: [],
          sql: ''
        }

        // 添加聊天框
        setChatRecord(item => [...item, addItem])
      } else if (res.type === 'end') { //结束会话
        setSubmitting(false);
        setResult([])
        setColumns(undefined)
      } else {
        const t_columns =  res.columns.map((item: any) => {
          console.log(item)
          return {
            title: item,
            dataIndex: item
          }
        })
        setColumns(t_columns)
        setResult(res.res);
        setCurSQL(res.sql)
      }
    };

    // 假设ws是已经创建好的WebSocket实例
    const ws = new WebSocket('ws://localhost:8081/api/websocket/sql/' + currentUser?.id);

    ws.onmessage = (event: any) => {
      handleMessage(event);
    };

    ws.onopen = (event: any) => {
      console.log('连接已建立')
    }

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="my-chat" style={{
      margin: '-32px -40px'
    }}>
      <WebSocketComponent userId={currentUser?.id}></WebSocketComponent>
      <Row gutter={16}>
        <Col span={5}>
          <Card style={{minHeight: '88vh'}}>
            <Space direction="horizontal" style={{width: '100%'}} size={20}>
              <div>
                <Input placeholder="搜索历史对话" suffix={<SearchOutlined/>}/>
              </div>
              <a onClick={() => {
                handleModalOpen(true)
              }}><PlusOutlined/></a>
            </Space>
            <div className="margin-16" />
            <div>
              <>
                {chatHistory?.map((item, index) => (
                  <>
                    <Card style={{ width: '100%', marginTop: 16 }} className={index === selectIndex ? 'active-item' : ''} hoverable loading={loading} onClick={() => {
                      setCurModel(item)
                      setSelectIndex(index)
                    }}>

                      <div className={index === selectIndex ? 'active-color' : ''}>
                        <img src={currentUser?.userAvatar} style={{width: '30px', borderRadius: '50%'}}/>
                        <span style={{marginLeft: '20px', fontSize: '14px'}}>{item.assistantName}</span>
                        <div style={{marginLeft: '50px', fontSize: '12px'}}>
                          <p>{item.functionDes}</p>
                        </div>
                      </div>
                    </Card>
                  </>
                ))}
              </>
            </div>
          </Card>
        </Col>
        <Col span={19} style={{
          position: "relative"
        }}>
            <Col span={24}>
              <Card style={{height: '93vh', position: "relative"}}>
                  {/*助手信息*/}
                  <div style={{
                    width: '100%',
                    height: '84vh',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'grey blue'
                  }} ref={scrollDomRef}>
                    <div style={{width: '100%', textAlign: "center"}}>
                      <h3 style={{fontWeight: "bold"}}>{curModel?.assistantName}</h3>
                    </div>
                    <div className="margin-16" />
                    {/* 渲染历史对话 */}
                    {
                      curModel && <>
                        <div>
                          <Space direction="horizontal">
                            <img src={'/model.png'} style={{width: '30px'}}/>
                            <div style={{marginTop: '5px',padding: '10px' , background: '#f4f6f8', borderRadius: '10px'}}>
                              {'你好，我是' + curModel?.assistantName + ',' + '我可以' + curModel?.functionDes}
                            </div>
                          </Space>
                          <div className="margin-16" />
                        </div>
                      </>
                    }

                    {
                      chatRecord?.map(item => (
                        <>
                          <div>
                            <Space direction="horizontal">
                              {item.chatRole === 0 && <>
                                <img src={currentUser?.userAvatar} style={{width: '30px',borderRadius: '50%'}}/>
                                <div style={{marginTop: '5px',padding: '10px' , background: '#e7f7ff', borderRadius: '10px'}}>{item.content}</div>
                              </>}
                              {item.chatRole === 1 && <>
                                  <img src={'/model.png'} style={{width: '30px'}}/>
                                <div style={{marginTop: '5px',padding: '10px' , background: '#f4f6f8', borderRadius: '10px'}}>
                                  <Table
                                    columns={item.columns}
                                    dataSource={item.res}
                                    pagination={false}
                                    size={'small'}
                                  />
                                  <Collapse items={[
                                    {
                                      key: '1',
                                      label: <>
                                      <span style={{color: '#1677ff'}}>查询SQL</span>
                                      </>,
                                      children: <p>{item.sql}</p>
                                    }
                                  ]} size={'small'} bordered={false} />
                                </div>
                                <div>
                                </div>
                              </>}
                            </Space>
                            <div className="margin-16" />
                          </div>
                        </>
                      ))
                    }
                  </div>

                <div style={{position: "fixed", bottom: '3vh', width: '70%'}}>
                  <Input
                    placeholder="请输入内容"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value)
                    }}
                    onPressEnter={(e) => {
                      sendQuestion()
                    }}
                    suffix={
                      <>
                      {
                        !submitting && <a onClick={() => {
                          sendQuestion()
                        }}><img src={'/send.png'} style={{width: '24px'}}/></a>
                      }
                      {
                        submitting && <Spin indicator={antIcon} />
                      }
                      </>
                    }
                  />
                </div>
              </Card>
            </Col>
        </Col>
      </Row>

      <ModalForm
        title={'新建对话'}
        width="600px"
        modalProps={{
          destroyOnClose: true,
        }}
        open={createModalOpen}
        onOpenChange={handleModalOpen}
        onFinish={async (value) => {
          console.log(value);
          const res = await addUserAskSqlHistoryUsingPost({ ...value });
          if (res.code === 0) {
            message.success('新建成功');
            handleModalOpen(false);
            loadData()
          } else {
            message.error(res.message);
          }
        }}
      >
        {addFormIndex.map((item, index) => (
          <div key={index}>
            {item.type === 'text' && (
              <>
                <ProFormText
                  rules={[
                    {
                      required: item.required,
                      message: item.message,
                    },
                  ]}
                  width="md"
                  name={item.name}
                  label={item.label}
                />
              </>
            )}

            {item.type === 'textArea' && (
              <>
                <ProFormTextArea
                  rules={[
                    {
                      required: item.required,
                      message: item.message,
                    },
                  ]}
                  width="md"
                  name={item.name}
                  label={item.label}
                />
              </>
            )}
            {item.type === 'select' && (
              <>
                <ProFormSelect
                  rules={[
                    {
                      required: item.required,
                      message: item.message,
                    },
                  ]}
                  request={async () => item.selectItem ?? []}
                  width="md"
                  name={item.name}
                  label={item.label}
                />
              </>
            )}
          </div>
        ))}
      </ModalForm>
    </div>
  );
};


export default AiAskData;


