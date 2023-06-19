var NodeHelper = require("node_helper");
var validUrl = require("valid-url");
var Fetcher = require("./fetcher.js");

module.exports = NodeHelper.create({
  start: function() {
    console.log("Starting module: " + this.name);
    this.fetchers = {};
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "ADD_FEED") {
      this.createFetcher(payload.feed, payload.config);
      return;
    }
  },

  createFetcher: function(feed, config) {
    var self = this;
    var url = feed.url || "";
    var encoding = feed.encoding || "UTF-8";
    var reloadInterval = feed.reloadInterval || config.reloadInterval || 5 * 60 * 1000;

    if (!validUrl.isUri(url)) {
      self.sendSocketNotification("INCORRECT_URL", url);
      return;
    }

    var fetcher;
    if (typeof self.fetchers[url] === "undefined") {
      console.log("Create new news fetcher for url: " + url + " - Interval: " + reloadInterval + " logo = " + feed.customLogo);
      fetcher = new Fetcher(url, reloadInterval, encoding, config.logFeedWarnings, feed.customLogo);

      fetcher.onReceive(function(fetcher) {
        var items = fetcher.items();
        for (var i in items) {
          var item = items[i];
          // item.image = this.feed_var_in_function.image;
        }
        self.broadcastFeeds();
      }.bind({ feed_var_in_function: feed }));

      fetcher.onError(function(fetcher, error) {
        self.sendSocketNotification("FETCH_ERROR", {
          url: fetcher.url(),
          error: error
        });
      });

      self.fetchers[url] = fetcher;
    } else {
      console.log("Use existing news fetcher for url: " + url);
      fetcher = self.fetchers[url];
      fetcher.setReloadInterval(reloadInterval);
      fetcher.broadcastItems();
    }

    fetcher.startFetch();
  },

  broadcastFeeds: function() {
    var feeds = {};
    for (var f in this.fetchers) {
      feeds[f] = this.fetchers[f].items();
    }
    this.sendSocketNotification("NEWS_ITEMS", feeds);
  }
});