/*
  Copyright (c) 2008 - 2016 MongoDB, Inc. <http://mongodb.com>

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

function CartDAO(database) {
    "use strict";

    const CART_COLLECTION_NAME = 'cart';

    this.db = database;

    this.getCart = function(userId, callback) {
        "use strict";

        var userCart = {
            userId: userId,
            items: []
        }

        var query = createUserQuery(userId);

        this.db.collection(CART_COLLECTION_NAME)
            .aggregate( [
                { $match: query },
                { $project: {
                    items: 1,
                    _id: 0
                } },
                { $unwind: "$items" },
                { $project: {
                    _id: "$items._id",
                    title: "$items.title",
                    slogan: "$items.slogan",
                    description: "$items.descrption",
                    stars: "$items.stars",
                    category: "$items.category",
                    img_url: "$items.img_url",
                    price: "$items.price",
                    reviews: "$items.reviews",
                    quantity: "$items.quantity"
                } }
            ] )
            .toArray(function(err, docs) {
                if (err) {
                    return;
                } else {
                    var i;
                    for (i = 0; i < docs.length; i++) {
                        userCart.items.push(docs[i]);
                    }

                    callback(userCart);;
                }
            }
        );
    }

    this.itemInCart = function(userId, itemId, callback) {
        "use strict";

        var query = createUseAndItemQuery(userId, itemId);

        this.db.collection(CART_COLLECTION_NAME)
            .find(query)
            .project( { "items.$": 1, _id: 0 } )
            .limit(1)
            .next(function(err, doc) {
                if (!err) {
                    callback(null);
                } else {
                    callback(doc.items[0]);
                }
        });
    }

    /*
     * This solution is provide as an example to you of several query
     * language features that are valuable in update operations.
     * This method adds the item document passed in the item parameter to the
     * user's cart. Note that this solution works regardless of whether the
     * cart already contains items or is empty. addItem will be called only
     * if the cart does not already contain the item. The route handler:
     * router.post("/user/:userId/cart/items/:itemId"...
     * handles this. Please review how that method works to have a complete
     * understanding of how addItem is used.
     *
     * NOTE: One may use either updateOne() or findOneAndUpdate() to
     * write this method. We did not discuss findOneAndUpdate() in class,
     * but it provides a very straightforward way of solving this problem.
     * See the following for documentation:
     * http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findOneAndUpdate
     *
     */
    this.addItem = function(userId, item, callback) {
        "use strict";

        // Will update the first document found matching the query document.
        this.db.collection("cart").findOneAndUpdate(
            // query for the cart with the userId passed as a parameter.
            {userId: userId},
            // update the user's cart by pushing an item onto the items array
            {"$push": {items: item}},
            // findOneAndUpdate() takes an options document as a parameter.
            // Here we are specifying that the database should insert a cart
            // if one doesn't already exist (i.e. "upsert: true") and that
            // findOneAndUpdate() should pass the updated document to the
            // callback function rather than the original document
            // (i.e., "returnOriginal: false").
            {
                upsert: true,
                returnOriginal: false
            },
            // Because we specified "returnOriginal: false", this callback
            // will be passed the updated document as the value of result.
            function(err, result) {
                assert.equal(null, err);
                // To get the actual document updated we need to access the
                // value field of the result.
                callback(result.value);
            });

        /*

          Without all the comments this code looks written as follows.

        this.db.collection("cart").findOneAndUpdate(
            {userId: userId},
            {"$push": {items: item}},
            {
                upsert: true,
                returnOriginal: false
            },
            function(err, result) {
                assert.equal(null, err);
                callback(result.value);
            });
        */

    };

    this.updateQuantity = function(userId, itemId, quantity, callback) {
        "use strict";

        var updateDoc = {};
        if (quantity === 0) {
            updateDoc = {
                "$pull": {
                    items: {
                        _id: itemId
                    }
                }
            };
        } else {
            updateDoc = {
                "$set": {
                    "items.$.quantity": quantity,
                }
            }
        }

        var query = createUseAndItemQuery(userId, itemId);

        this.db.collection(CART_COLLECTION_NAME).findOneAndUpdate(
            query,
            updateDoc,
            {
                returnOriginal: false
            },
            function(err, result) {
                callback(result.value);
            });
    }

    this.createDummyItem = function() {
        "use strict";

        var item = {
            _id: 1,
            title: "Gray Hooded Sweatshirt",
            description: "The top hooded sweatshirt we offer",
            slogan: "Made of 100% cotton",
            stars: 0,
            category: "Apparel",
            img_url: "/img/products/hoodie.jpg",
            price: 29.99,
            quantity: 1,
            reviews: []
        };

        return item;
    }

    function createUseAndItemQuery(userId, itemId) {
        return {
            userId: userId,
            "items._id":  itemId
        };
    }

    function createUserQuery(userId) {
        return {
            userId: userId
        };
    }
}

module.exports.CartDAO = CartDAO;