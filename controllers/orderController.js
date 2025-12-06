//訂單相關函式

const pool = require('../db/db');
const Joi = require('joi');
require('dotenv').config();


// Joi 驗證 schema
//Joi.object({...})定義規則
const orderSchema = Joi.object({
    imgFileId:Joi.string().allow('', null), 
    imgFileUrl:Joi.string().allow('', null), 
    num:Joi.number().integer().min(1).max(99).allow('', null), 
    price:Joi.number().integer().min(1).allow('', null), 
    technique:Joi.string().valid("3D列印", "光固化").allow('', null),
    material:Joi.string().allow('', null),
    color:Joi.string().allow('', null),
    supportMaterial:Joi.number().integer().min(1).max(10).allow('', null), 
    wallThickness:Joi.number().integer().min(1).max(50).allow('', null), 
    supportDensity:Joi.number().integer().min(1).max(50).allow('', null),
    orderType:Joi.string().valid("urgent", "normal", "slow").allow('', null), 
    productionTime:Joi.string().pattern(/^\d{4}\/\d{1,2}\/\d{1,2}$/).allow(null, ''), 
    productionEndTime:Joi.string().pattern(/^\d{4}\/\d{1,2}\/\d{1,2}$/).allow(null, ''),
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

//取得訂單
    exports.getOrder = async (req, res) => {
        //從token解析資料並放入req.user中再從user取出資料
        const userId = req.user.userId;
        //從token解析資料並放入req.user中再從user取出資料

        try {
            //將order_list跟order_items合併搜尋取出訂單資料
            const orderDataRef = await pool.query(
                `SELECT 
                    order_list.id,
                    order_list.state,
                    order_items.imgfileurl,
                    order_items.imgfileid,
                    order_items.num,
                    order_items.price,
                    order_items.supportmaterial,
                    order_items.supportdensity,
                    order_items.wallthickness,
                    order_items.ordertype,
                    order_items.productiontime,
                    order_items.productionendtime,
                    print_items.technique,
                    print_items.material,
                    print_items.color
                FROM order_items
                JOIN order_list ON order_items.order_id = order_list.id
                JOIN print_items ON order_items.print_items_id = print_items.id
                WHERE order_list.user_id = $1`,
                //JOIN使用方法
                // FROM 本地資料表 
                // JOIN 目標資料表 ON 本地關聯欄位 = 目標關聯欄位;
                [userId]
            );

            //檢查是否有資料
            if(orderDataRef.rowCount === 0){
                return res.status(200).json({
                    message: '該用戶目前並無訂單',
                });
            }
            //檢查是否有資料

            // 有資料時繼續處理
            const orderData = orderDataRef.rows;
            //將order_list跟order_items合併搜尋取出訂單資料

            return res.status(200).json({
                message: '取得訂單資料成功',
                orderData: orderData, 
            });
        } catch (err) {
            console.error('訂取得訂單資料失敗', err);
            res.status(500).json({ error: '取得訂單資料失敗' });
        }
    };
//取得訂單

//新增訂單
    exports.registerOrder = async (req, res) => {
        //從token解析資料並放入req.user中再從user取出資料
        const userId = req.user.userId;
        //從token解析資料並放入req.user中再從user取出資料

        //對進來的檔案進行解構
        const { 
            imgFileId,
            imgFileUrl,
            num,
            price,
            technique,
            material,
            color,
            supportMaterial,
            wallThickness,
            supportDensity,
            orderType,
            productionTime,
            productionEndTime,
        } = req.body;
        //對進來的檔案進行解構

        //將資料進行轉換
        const cleanedData = {
            imgFileId: trimToNull(imgFileId),
            imgFileUrl: trimToNull(imgFileUrl),
            num: trimToNull(num),
            price: trimToNull(price),
            technique: trimToNull(technique),
            material: trimToNull(material),
            color: trimToNull(color),
            supportMaterial: trimToNull(supportMaterial),
            wallThickness: trimToNull(wallThickness),
            supportDensity: trimToNull(supportDensity),
            orderType: trimToNull(orderType),
            productionTime: trimToNull(productionTime),
            productionEndTime: trimToNull(productionEndTime),
        };
        //將資料進行轉換

        //Joi 驗證
        //orderSchema為剛剛建立的規則
        const { error } = orderSchema.validate(cleanedData);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        try {

            //新增list資料並回傳id
            const listData = await pool.query(
                `INSERT INTO public.order_list 
                (   
                    user_id,
                    created_at, 
                    updated_at,
                    state
                )
                VALUES($1,now(), now(), 'wait')
                RETURNING id`,
                [userId]
            );
            const orderId = listData.rows[0].id;
            //新增list資料並回傳id

            //從print_items中取得id
            const print_items_id_Ref = await pool.query(
                `SELECT id 
                FROM print_items 
                WHERE technique = $1 
                    AND material = $2 
                    AND color = $3`,
                [
                    cleanedData.technique,
                    cleanedData.material,
                    cleanedData.color,
                ]
            );
            const print_items_id = print_items_id_Ref.rows[0].id;
            //從print_items中取得id

            //寫入資料庫
            const orderData = await pool.query(
            ` 
                INSERT INTO public.order_items 
                (
                    order_id,
                    print_items_id,
                    imgfileid,
                    imgfileurl,
                    num,
                    price,
                    supportmaterial,
                    wallthickness,
                    supportdensity,
                    ordertype,
                    productiontime,
                    productionendtime
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                RETURNING *
            `,
            [   
                orderId,
                print_items_id,
                cleanedData.imgFileId,
                cleanedData.imgFileUrl,
                cleanedData.num,
                cleanedData.price,
                cleanedData.supportMaterial,
                cleanedData.wallThickness,
                cleanedData.supportDensity,
                cleanedData.orderType,
                cleanedData.productionTime,
                cleanedData.productionEndTime
            ]
            );

            return res.status(201).json({
                message: '訂單新增成功',
                orderData: orderData.rows[0], 
            });
        } catch (err) {
            console.error('訂單新增失敗', err);
            res.status(500).json({ error: '訂單新增失敗' });
        }
    };
//新增訂單

//刪除訂單
exports.deleteOrder = async (req, res) => {
    // 從 token 取得 userId
    const userId = req.user.userId;

    // 從 URL 取得訂單 id
    const { orderId }= req.body;

    try {
        // 確認訂單是否屬於此使用者
        const checkOrder = await pool.query(
            `SELECT id FROM order_list WHERE id = $1 AND user_id = $2`,
            [orderId, userId]
        );

        if (checkOrder.rowCount === 0) {
            return res.status(404).json({
                message: '找不到此訂單或您沒有權限刪除它',
            });
        }

        // 先刪除 order_items
        await pool.query(
            `DELETE FROM order_items WHERE order_id = $1`,
            [orderId]
        );

        // 再刪除 order_list
        await pool.query(
            `DELETE FROM order_list WHERE id = $1`,
            [orderId]
        );

        return res.status(200).json({
            message: '訂單刪除成功',
        });

    } catch (err) {
        console.error('刪除訂單失敗', err);
        res.status(500).json({ error: '刪除訂單失敗' });
    }
};
//刪除訂單


//管理員用api

    //取得所有訂單
        exports.getAllOrder = async (req, res) => {

            try {

                //將order_list跟order_items合併搜尋取出訂單資料
                const allOrderDataRef = await pool.query(
                    `SELECT
                        users.username,
                        order_list.id,
                        order_list.state,
                        order_items.imgfileurl,
                        order_items.imgfileid,
                        order_items.num,
                        order_items.price,
                        order_items.supportmaterial,
                        order_items.supportdensity,
                        order_items.wallthickness,
                        order_items.ordertype,
                        order_items.productiontime,
                        order_items.productionendtime,
                        print_items.technique,
                        print_items.material,
                        print_items.color
                    FROM order_items
                    JOIN order_list ON order_items.order_id = order_list.id
                    JOIN users ON order_list.user_id = users.id
                    JOIN print_items ON order_items.print_items_id = print_items.id`,
                    //JOIN使用方法
                    // FROM 本地資料表 
                    // JOIN 目標資料表 ON 本地關聯欄位 = 目標關聯欄位;
                );

                //檢查是否有資料
                if(allOrderDataRef.rowCount === 0){
                    return res.status(200).json({
                        message: '目前並無訂單',
                    });
                }
                //檢查是否有資料

                // 有資料時繼續處理
                const allOrderData = allOrderDataRef.rows;
                //將order_list跟order_items合併搜尋取出訂單資料

                return res.status(200).json({
                    message: '取得所有訂單資料成功',
                    allOrderData: allOrderData, 
                });
            } catch (err) {
                console.error('取得所有訂單資料失敗', err);
                res.status(500).json({ error: '取得所有訂單資料失敗' });
            }
        };
    //取得所有訂單

    //取得今日所有訂單
        exports.getToDayOrder = async (req, res) => {

            try {

                //將order_list跟order_items合併搜尋取出訂單資料
                const toDayOrderDataRef = await pool.query(
                    `SELECT
                    users.username,
                    order_list.id,
                    order_list.state,
                    order_items.imgfileurl,
                    order_items.imgfileid,
                    order_items.num,
                    order_items.price,
                    order_items.supportmaterial,
                    order_items.supportdensity,
                    order_items.wallthickness,
                    order_items.ordertype,
                    order_items.productiontime,
                    order_items.productionendtime,
                    print_items.technique,
                    print_items.material,
                    print_items.color
                    FROM order_items
                    JOIN order_list  ON order_items.order_id        = order_list.id
                    JOIN users ON order_list.user_id = users.id
                    JOIN print_items ON order_items.print_items_id  = print_items.id
                    WHERE (order_list.created_at AT TIME ZONE 'Asia/Taipei')::date
                        = (now() AT TIME ZONE 'Asia/Taipei')::date
                    ORDER BY order_list.id DESC`,
                    //AT TIME ZONE 作用是轉換時區
                    //'Asia/Taipei' 要轉換的時區
                    //::date 將天以下的時間單位都移除
                    //原始資料:2025-10-05 14:07:12.321 +0800
                    //AT TIME ZONE 'Asia/Taipei' 轉換後(本地時間，無時區) 2025-10-05 14:07:12.321
                    //(… )::date 過濾後 2025-10-05
                );

                //檢查是否有資料
                if(toDayOrderDataRef.rowCount === 0){
                    return res.status(200).json({
                        message: '今日並無訂單',
                    });
                }
                //檢查是否有資料

                // 有資料時繼續處理
                const toDayOrderData = toDayOrderDataRef.rows;
                //將order_list跟order_items合併搜尋取出訂單資料

                return res.status(200).json({
                    message: '取得今日所有訂單資料成功',
                    toDayOrderData: toDayOrderData, 
                });
            } catch (err) {
                console.error('取得今日所有訂單資料失敗', err);
                res.status(500).json({ error: '取得今日所有訂單資料失敗' });
            }
        };
    //取得所有訂單

    //審核訂單
        exports.reviewOrder = async (req, res) => {

            //先進行解構
                const { id, state } = req.body;
            //先進行解構

            //檢查ID不可全為空
            if (!id) {
                return (res.status(400).json({ error: "請提供訂單ID" }));
            }
            //檢查state不可全為空

            //檢查ID不可全為空
            if (!state) {
                return (res.status(400).json({ error: "審核狀態不可為空" }));
            }
            //檢查state不可全為空


            try {

                const reviewDataRef = await pool.query(
                    `UPDATE order_list 
                    SET state = $2
                    WHERE id = $1
                    RETURNING id, state`,
                    [id, state]
                );

                //檢查是否有資料
                if(reviewDataRef.rowCount === 0){
                    return res.status(404).json({
                        error: '訂單審核失敗',
                    });
                }
                //檢查是否有資料

                // 有資料時繼續處理
                const reviewData = reviewDataRef.rows;

                return res.status(200).json({
                    message: '訂單審核成功',
                    reviewData: reviewData, 
                });
            } catch (err) {
                console.error('訂單審核失敗', err);
                res.status(500).json({ error: '訂單審核失敗' });
            }
        };
    //審核訂單

    //刪除訂單
    exports.deleteSingleOrder = async (req, res) => {

        // 從 URL 取得訂單 id
        const rawId = req.params.id;
        //轉為數字
        const orderId = Number(rawId);
        //如果不存在或不是數字則移除
        if (!orderId || isNaN(orderId)) {
            return res.status(400).json({ message: '訂單編號錯誤' });
        }

        try {
            // 確認訂單是否存在
            const checkOrder = await pool.query(
                `SELECT id FROM order_list WHERE id = $1`,
                [orderId]
            );

            if (checkOrder.rowCount === 0) {
                return res.status(404).json({
                    message: '找不到此訂單',
                });
            }

            // 先刪除 order_items
            await pool.query(
                `DELETE FROM order_items WHERE order_id = $1`,
                [orderId]
            );

            // 再刪除 order_list
            await pool.query(
                `DELETE FROM order_list WHERE id = $1`,
                [orderId]
            );

            return res.status(200).json({
                message: '訂單刪除成功',
            });

        } catch (err) {
            console.error('刪除訂單失敗', err);
            res.status(500).json({ error: '刪除訂單失敗' });
        }
    };
    //刪除訂單

    //取得長條圖表用資料：
    exports.getBarChartData = async (req, res) => {
        try {
            const data = await pool.query(`
                SELECT
                    to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 0, 'YYYY-MM-DD') AS day01,
                    to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 1, 'YYYY-MM-DD') AS day02,
                    to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 2, 'YYYY-MM-DD') AS day03,
                    to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 3, 'YYYY-MM-DD') AS day04,
                    to_char((now() AT TIME ZONE 'Asia/Taipei')::date - 4, 'YYYY-MM-DD') AS day05,

                    COUNT(*) FILTER (
                        WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = (now() AT TIME ZONE 'Asia/Taipei')::date - 0)::int AS day01total,

                    COUNT(*) FILTER (
                        WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = (now() AT TIME ZONE 'Asia/Taipei')::date - 1)::int AS day02total,

                    COUNT(*) FILTER (
                        WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = (now() AT TIME ZONE 'Asia/Taipei')::date - 2)::int AS day03total,
                    
                    COUNT(*) FILTER (
                        WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = (now() AT TIME ZONE 'Asia/Taipei')::date - 3)::int AS day04total,

                    COUNT(*) FILTER (
                        WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = (now() AT TIME ZONE 'Asia/Taipei')::date - 4)::int AS day05total
                FROM order_list
            `);

            const dayData = [data.rows[0].day05,data.rows[0].day04,data.rows[0].day03,data.rows[0].day02,data.rows[0].day01];
            const totalData = [data.rows[0].day05total,data.rows[0].day04total,data.rows[0].day03total,data.rows[0].day02total,data.rows[0].day01total];

            res.json({
                message: '長條圖資料取得成功',
                ChartData: {
                    dayData:dayData,
                    totalData:totalData,
                },
            });
        } catch (err) {
        console.error("長條圖資料取得失敗", err);
        res.status(500).json({ error: '長條圖資料取得失敗' });
        }
    };
    //方案一
        //WITH days AS (
            //WITH days AS() 其中days是自取名稱 其作用有點像是宣告函式方便往後使用
        //SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Taipei')::date - daysRule) AS day
            //date_trunc('day', …)把時、分、秒去除以天為標準，效果如下
            //2025-10-09 00:30:00 => 2025-10-09 00:00:00
            //now() 取得「現在這一刻的時間」型別是 timestamptz
            //AT TIME ZONE 'Asia/Taipei' 時區轉換運算子，將now()轉換為台北當地時間。效果如下
            //now()內容:2025-10-08 16:30:00+00 轉換後=> 2025-10-09 00:30:00（台北時間 +08:00）
            //::date型別轉換，效果如下:
            //2025-10-09 00:00:00 => 2025-10-09
            //- dayRule 套用dayRule函式
            //AS day 改名為day
        //FROM generate_series(0, 4, 1) AS daysRule
            //generate_series(start, stop, gap),會「產生一組連續值」作為資料表傳回，效果如下
            //generate_series(0, 10, 2) => 0,2,4,6,8,10
            //也支援時間 
            // generate_series(
            //     TIMESTAMP '2025-10-01',
            //     TIMESTAMP '2025-10-05',
            //     INTERVAL '1 day'
            // )
            //會產生 2025-10-01 ~ 2025-10-05 每天一列
            //AS daysRule 別名
            //以generate_series(0, 10, 2) AS test 來說
            //臨時建立一個名為test的資料表，欄位名稱為generate_series，內部資料開始為0結尾為10間格2依序建立(0,2,4,6,8,10)
    //方案一

    //方案2
        // SELECT
        //         to_char((created_at AT TIME ZONE 'Asia/Taipei')::date, 'YYYY-MM-DD')AS day,  
        //         COUNT(*)::int AS total
        //         -- 一樣先將created_at欄位的資料型式過濾為2025-10-07這種形式在別名為day
        //         -- COUNT計算資料筆數
        //         -- 計算所有
        //     FROM order_list
        //     -- 從order_list資料表找資料
        //     WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date
        //         BETWEEN (now() AT TIME ZONE 'Asia/Taipei')::date - 4  
        //             AND (now() AT TIME ZONE 'Asia/Taipei')::date
        //     -- 先將created_at欄位的資料型式過濾為2025-10-07這種形式
        //     -- 使用BETWEEN A AND B 保留A到B的資料
        //     -- 保留台北「日期」在 今天-4 到 今天
        //     GROUP BY 1
        //     ORDER BY day
    //方案2


//管理員用api
