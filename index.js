
const request = require('request');  // load libs
const dotenv = require ('dotenv');
dotenv.config(); //need to load this one explicitly...

//--------------------------------------------------------------------------------------------------------------
//Receive Function

function Receive_From_Shopify(event)
{
  return JSON.parse(event.body); 
}
//--------------------------------------------------------------------------------------------------------------
// "Translate" - A function to copy certain fields from the Shopify Order that HAS ARRIVED into a data structure ready to send to Yojee

function Translate(data)
{
      return {
       
        external_id: `${data.id}`,
        
        external_sender_id: 'Shopify', //hardwire this for these purposes
        sender_type: 'organisation', //hardwire this for these purposes
        price_amount: data.total_price,
        price_currency: data.currency,
        item_steps: [
          ...data.line_items.map((_, index) => { // note use of "map" and "..."
            return {
              item_id: index, order_step_id: 0, type: 'pickup' 
            };
          }), ...data.line_items.map((_, index) => {
            return {
              item_id: index, order_step_id: 0, type: 'dropoff' 
            };
          })
        ],
        steps: [{    //define the structure that will be populated and sent to Yojee
            quantity: data.line_items.length, //map straight from incoming file
            address: data.shipping_address.address1, //map straight from incoming file
            address2: '', // hardwire, as couldn't see this info in the file coming in from Shopify
            country: data.shipping_address.country_code, //map straight from incoming file
            state: data.shipping_address.province, //map straight from incoming file
            postal_code: data.shipping_address.zip, //map straight from incoming file
            contact_company: data.shipping_address.company, //map straight from incoming file
            contact_name: data.shipping_address.first_name, //map straight from incoming file
            contact_phone: data.shipping_address.phone, //map straight from incoming file
            contact_email: data.customer.email, //map straight from incoming file
            from_time: '2021-08-01T08:59:22.813Z', //pickup between (08:59 ZULU TIME [aka GMT]) ... i.e 16:59hrs SG time on 1st Aug 2021...
            to_time: '2021-08-02T07:59:59.813Z' //...and 15:59 SG time on 2nd Aug 2021
          }
        ],
        items: data.line_items.map((item) => {
          return {
            description: item.title, //the items are laptops - size and weight info follows, so courier can decide what sort of transport to use...
            width: 0, // hardwire, as couldn't see this info in the file coming in from Shopify
            length: 0, // hardwire, as couldn't see this info in the file coming in from Shopify
            height: 0, // hardwire, as couldn't see this info in the file coming in from Shopify
            weight: item.grams, //map straight from incoming file
            quantity: item.quantity, //map straight from incoming file
            info: item.name, //map straight from incoming file
            external_customer_id: data.customer.id, //map straight from incoming file
            external_customer_id2: data.customer.id, //map straight from incoming file
            external_customer_id3: data.customer.id, //map straight from incoming file
            payload_type: data.shipping_lines[0].title, //map straight from incoming file
            price_info: item.price, //map straight from incoming file
            service_type: '', // hardwire, as couldn't see this info in the file coming in from Shopify
            volume: 0, // hardwire, as couldbnt see this info in the file coming in from Shopify
            volumetric_weight: 1, // hardwire, as couldn't see this info in the file coming in from Shopify
            price_amount: 0 // hardwire, as couldn't see this info in the file coming in from Shopify
          };
        })
    };
}

//--------------------------------------------------------------------------------------------------------------
// "Send To Yojee" - A Function to send the translated Transport Order to Yojee.
// note that not all fields sent from Shopfy are sent...

async function Send_To_Yojee(orderData)
{
  const options = {
    method: 'POST', //API call type - we POSTING to Yojee
    url: 'https://umbrella-dev.yojee.com/api/v3/dispatcher/orders', //URL of Yojee's API
   // headers: { 'Content-Type': 'application/json', company_slug: 'kcytest01', access_token: 'uFerDJFNOmF/i01XRpbcJVUDsztlEmFJCWjtqGW5leE=' },
    headers: { 'Content-Type': 'application/json', company_slug: `${process.env.COMPANY_SLUG}`, access_token: `${process.env.ACCESS_TOKEN}` },
    //above is environment and access infor the KCY gave me
    body: orderData,
    
    json: true
  };
  
  //------------------------------------------------------------------------------
 //this stops Lambda from 'bombing out' and shutting down too early
  const sendPromise = await (new Promise((resolve, reject) => {
    request(options, (error, res, body) => {
      if (!error && res.statusCode == 200)
      {
        console.log(body);
        resolve(body);
      }
      else
      {
        console.log(error);
        reject(error);
      }
    });
  }));
}

//----------------------------------------------------------------------------------
//Main

exports.handler = async(event) => //'Exports' is the handler that you set up - in this case, its just "send_test', which contains {}"
                                  // asynch means 'call it, but dont wait', 'event' is param being passed i - in this case, its never actiually used internally..
{

    const shopifyData = Receive_From_Shopify(event);
    const translated = Translate(shopifyData);
    await Send_To_Yojee(translated); //foced into synch mode to wait for confirmation from Yojee that message was received and understood.
    
    return {
      statusCode: 200,
      body: null
    };
  };
//---------------------------------------------------------------------------------
