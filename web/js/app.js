(function () {
  `use strict`;

  angular
    .module('forgetmenot', [])
    .factory('factory', factory)
    .controller('controller', controller);

  factory.$inject = ['$http', '$q'];
  controller.$inject = ['factory'];

  function controller(fact) {

    var ctrl = this;

    // Signature
    ctrl.foundWeb3 = false;
    ctrl.web3Version = 0;
    ctrl.initError = false;

    ctrl.coinbase = "";
    ctrl.balance = 0;
    ctrl.events = [];

    ctrl.refresh = refresh;
    ctrl.addEvent = addEvent;

    ctrl.submitted = true;


    // init
    if (typeof web3 !== 'undefined') {

      console.log(`web3js version: ${web3.version.api}`);
      ctrl.foundWeb3 = true;
      ctrl.web3Version = web3.version.api;

      web3 = new Web3(web3.currentProvider);

      fact.Init(web3)
        .then(r => {
          return fact.GetCoinbase();
        })
        .then(coinbase => {
          ctrl.coinbase = coinbase;
          return fact.GetBalance(ctrl.coinbase);
        })
        .then(balance => {
          ctrl.balance = balance;
        })
        .catch(e => {
          initError = e;
        });

    }

    // Methods
    function refresh() {
      ctrl.events = [];
      __recursiveFetch(web3.eth.defaultBlock);
    }

    function __recursiveFetch(block) {

      fact.GetEventAtBlock(block)
        .then(event => {

          if (event.createdBlock !== event.linkToPreviousBlock) {

            if(block == web3.eth.defaultBlock) {
              event.latest = true;
            }

            ctrl.events.push(event);
            
            if (event.linkToPreviousBlock !== 0) {
              __recursiveFetch(event.linkToPreviousBlock);
            }

          }
        });
    }

    function addEvent(newKey, newValue) {
      ctrl.submitted = false;

      fact.AddEvent(newKey, newValue)
      .then( response => {
        ctrl.submitted = true;
      });
    }

  }

  function factory($http, $q) {

    let __contract = {};
    let __web3 = {};

    const Model = (key, value, createdBlock, linkToPreviousBlock) => {
      return {
        key: key,
        value: value,
        createdBlock: createdBlock,
        linkToPreviousBlock: linkToPreviousBlock
      };
    };

    function Init(web3) {

      __web3 = web3;

      const q = $q.defer();

      $http.get('./Forgetmenot.json')
        .then(response => {
          console.log(`Contract Address ${response.data.networks["4447"].address}`);

          const cont = __web3.eth.contract(response.data.abi);
          __contract = cont.at(response.data.networks["4447"].address);

          q.resolve();

        })
        .catch(err => {
          console.log(`Init Error`, err);
          q.reject();
        });

      return q.promise;
    }

    function GetEventAtBlock(blocknumber) {

      const q = $q.defer();

      __contract.fetchEntry(undefined, undefined, blocknumber, (err, data) => {

        if (err) {
          console.log(`GetEventAtBlock Error ${blocknumber}`, err.message);
          q.reject(err);
        }

        console.log('GetEventAtBlock response', data);

        q.resolve(Model(data[0], data[1], data[2].toNumber(), data[3].toNumber()));

      });

      return q.promise;

    }

    function AddEvent(key, value) {

      const q = $q.defer();

      __contract.createEntry(key, value, undefined, undefined, (err, data) => {

        if (err) {
          console.log('AddEvent error', err.message);
          q.reject(err);
        }

        console.log('AddEvent response', data);
        q.resolve(data);
      });

      return q.promise;
    }

    function GetBalance(coinbase) {

      const q = $q.defer();

      __web3.eth.getBalance(coinbase, (err, response) => {

        if (err) {
          q.reject(err);
        }

        const balance = web3.fromWei(response.toNumber(), "ether");
        console.log(`Balance = ${balance} ether`);

        q.resolve(balance);

      });

      return q.promise;
    }

    function GetCoinbase() {
      const q = $q.defer();
      q.resolve(web3.eth.coinbase);
      return q.promise;
    }

    return {
      Model: Model,
      Init: Init,
      GetEventAtBlock: GetEventAtBlock,
      AddEvent: AddEvent,
      GetCoinbase: GetCoinbase,
      GetBalance: GetBalance
    };
  }

})();