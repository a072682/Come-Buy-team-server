
//會員留言等相關函式

const pool = require('../db/db');
const Joi = require('joi');
require('dotenv').config();


// Joi 驗證 schema
//Joi.object({...})定義規則
const messageSchema = Joi.object({
    messageContent: Joi.string().allow('', null),
});


// 把「空字串」或「只有空白的字串」視為沒有值（轉成 null）；其他類型保持原樣
const trimToNull = (data) => {
  if (data == null) return null;                  
  // 如果進來的資料為null則直接回覆null
  if (typeof data === 'string') {
  // 如果進來的資料類型是字串則運行以下內容
    const newData = data.trim();
    //對data去掉前後空白並將數值給予newData
    return newData === '' ? null : newData;                
    //如果newData是空字串("")則回覆null否則就原樣回覆
  }
  return data;                                    
  // 其他型別維持原樣（通常不會用到）
};


//新增會員留言
exports.userMessageUpLoad = async (req, res) => {

    //從token解析資料並放入req.user中再從user取出資料
        const userId = req.user.userId;
    //從token解析資料並放入req.user中再從user取出資料

    //進行解構
        const { message } = req.body;
    //進行解構

    //將資料進行轉換
        const messageData = trimToNull(message);
    //將資料進行轉換

    //Joi 驗證
        const { error } = messageSchema.validate({ messageContent:messageData });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
    //Joi 驗證

    try {

        //新增list資料並回傳id
            const listData = await pool.query(
                `INSERT INTO public.message_list 
                (   
                    user_id,
                    created_at, 
                    updated_at
                )
                VALUES($1,now(), now())
                RETURNING id`,
                [userId]
            );
            const listId = listData.rows[0].id;
        //新增list資料並回傳id

        //寫入留言
            const messageDataRef = await pool.query(
            ` 
                INSERT INTO message_items 
                (   
                    message_list_id, 
                    message_content
                ) 
                VALUES ($1, $2) 
                RETURNING *
            `,
            [listId, messageData]
            );
        //寫入留言

        return res.status(201).json({
            message: '留言寫入成功', 
            messageData:messageDataRef.rows,
        });
    } catch (err) {
        console.error('留言寫入失敗', err);
        res.status(404).json({ error: '留言寫入失敗' });
    }
};


//管理員用api

    //取得所有留言
        exports.getAllMessage = async (req, res) => {

            try {

                //將order_list跟order_items合併搜尋取出留言資料
                const allMessageDataRef = await pool.query(
                    `SELECT 
                        users.username,
                        message_list.id,
                        message_list.created_at,
                        message_items.message_content
                    FROM message_items
                    JOIN message_list ON message_items.message_list_id = message_list.id
                    JOIN users ON message_list.user_id = users.id`,
                    //JOIN使用方法
                    // FROM 本地資料表 
                    // JOIN 目標資料表 ON 本地關聯欄位 = 目標關聯欄位;
                );

                //檢查是否有資料
                if(allMessageDataRef.rowCount === 0){
                    return res.status(200).json({
                        message: '目前並無留言',
                    });
                }
                //檢查是否有資料

                // 有資料時繼續處理
                const allMessageData = allMessageDataRef.rows;
                //將order_list跟order_items合併搜尋取出訂單資料

                return res.status(200).json({
                    message: '取得所有留言資料成功',
                    allMessageData: allMessageData, 
                });
            } catch (err) {
                console.error('取得所有留言資料失敗', err);
                res.status(500).json({ error: '取得所有留言資料失敗' });
            }
        };
    //取得所有留言

    //取得今日所有留言
        exports.getToDayMessage = async (req, res) => {

            try {

                //將order_list跟order_items合併搜尋取出訂單資料
                const toDayMessageDataRef = await pool.query(
                    `SELECT
                        users.username,
                        message_list.id,
                        message_list.created_at,
                        message_items.message_content
                    FROM message_items
                    JOIN message_list ON message_items.message_list_id = message_list.id
                    JOIN users ON message_list.user_id = users.id
                    WHERE (message_list.created_at AT TIME ZONE 'Asia/Taipei')::date
                        = (now() AT TIME ZONE 'Asia/Taipei')::date
                    ORDER BY message_list.id DESC`,
                    //AT TIME ZONE 作用是轉換時區
                    //'Asia/Taipei' 要轉換的時區
                    //::date 將天以下的時間單位都移除
                    //原始資料:2025-10-05 14:07:12.321 +0800
                    //AT TIME ZONE 'Asia/Taipei' 轉換後(本地時間，無時區) 2025-10-05 14:07:12.321
                    //(… )::date 過濾後 2025-10-05
                );

                //檢查是否有資料
                if(toDayMessageDataRef.rowCount === 0){
                    return res.status(200).json({
                        message: '今日並無留言',
                    });
                }
                //檢查是否有資料

                // 有資料時繼續處理
                const toDayMessageData = toDayMessageDataRef.rows;
                //將order_list跟order_items合併搜尋取出訂單資料

                return res.status(200).json({
                    message: '取得今日所有留言資料成功',
                    toDayMessageData: toDayMessageData, 
                });
            } catch (err) {
                console.error('取得今日所有留言資料失敗', err);
                res.status(500).json({ error: '取得今日所有留言資料失敗' });
            }
        };
    //取得今日所有留言

    //刪除留言
    exports.deleteMessage = async (req, res) => {

        // 從 URL 取得訂單 id
        const rawId = req.params.id;
        //轉為數字
        const messageId = Number(rawId);
        //如果不存在或不是數字則移除
        if (!messageId || isNaN(messageId)) {
            return res.status(400).json({ message: '留言錯誤' });
        }

        try {
            // 確認留言是否存在
            const checkMessage = await pool.query(
                `SELECT id FROM message_list WHERE id = $1`,
                [messageId]
            );

            if (checkMessage.rowCount === 0) {
                return res.status(404).json({
                    message: '並無此留言',
                });
            }

            // 先刪除 message_items
            await pool.query(
                `DELETE FROM message_items WHERE message_list_id = $1`,
                [messageId]
            );

            // 再刪除 message_list
            await pool.query(
                `DELETE FROM message_list WHERE id = $1`,
                [messageId]
            );

            return res.status(200).json({
                message: '留言刪除成功',
            });

        } catch (err) {
            console.error('留言訂單失敗', err);
            res.status(500).json({ error: '留言訂單失敗' });
        }
    };
    //刪除留言


//管理員用api




