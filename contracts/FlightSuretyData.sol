pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    uint256 private contractBalance = 0 ether;

    address[] public multiCalls = new address[](0);

    // Airlines
    struct Airline {
        bool registered;
        uint256 balance;
    }

    mapping(address => Airline) private airlines;
    address[] private registeredAirlines;
    uint256 public constant REGISTRATION_FEE = 10 ether;


    struct Passenger {   //Passenger Struct
        bool isInsured;
        bool[] isPaid;
        uint256[] insurancePaid;
        string[] flights;
    }

    //Flight mapping Amount
    mapping(string => uint256) private flightInsuranceTotalAmount;

    //Passenger mapping
    mapping(address => Passenger) public insurancePassengers;

    //Flight mapping Passenger
    mapping(string => address[]) private flightPassengers;

    //Passenger address to insurance payment. Stores Insurance payouts for passengers
    mapping(address => uint256) private insurancePayment;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                (
                    address wallet
                ) 
                public
    {
        contractOwner = msg.sender;
        initialFirstAirline(wallet);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;
        // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function clearMultiCalls() public{
        multiCalls = new address[](0);
    }

    function getMultiCallsItem(uint _i) public returns(address){
        return multiCalls[_i];
    }

    function multiCallsLength() public returns(uint){
        return multiCalls.length;
    }

    
    function putMultiCallsItem(address _address) public {
        multiCalls.push(_address);
    }

    function isPassengerInsured
                                (
                                    address passenger
                                )
                                public
                                requireIsOperational
                                returns (bool isInsured)
        {
            return insurancePassengers[passenger].isInsured;
        }

        /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus(bool mode) external requireContractOwner
    {
        operational = mode;
    }


    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational() public view returns (bool)
    {
        return operational;
    }

        function isAirlineRegistered
                                (
                                    address wallet
                                ) 
                                view 
                                requireIsOperational 
                                returns (bool success) 
    {
        return airlines[wallet].registered;
    }

    function isAirlineFunded(
                                address wallet
                            ) 
                            view 
                            requireIsOperational 
                            returns (bool success) 
    {
        return airlines[wallet].balance >= REGISTRATION_FEE;
    }

    function getAirlineNum() 
                            view 
                            requireIsOperational 
                            returns (uint num)
    {
        return registeredAirlines.length;
    }


    function getPassengerCredits
                                (
                                    address wallet
                                )
                                external 
                                view 
                                requireIsOperational 
                                returns(uint256 amount)
    {
        return insurancePayment[wallet];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    function getContractBalance() 
                                external 
                                view 
                                requireIsOperational 
                                returns(uint256 balance)
    {
        return contractBalance;
    }

    function getAirlineFund
                            (
                                address wallet
                            ) 
                            external 
                            view 
                            requireIsOperational 
                            returns(uint256 balance)
    {
        return airlines[wallet].balance;
    }

    function initialFirstAirline
                                (
                                    address wallet
                                ) 
                                internal 
                                requireIsOperational
    {
        airlines[wallet] = Airline({registered : true, balance : 0});
        registeredAirlines.push(wallet);
    }
    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline
                            (
                                address wallet
                            ) 
                            external 
                            requireIsOperational
    {
        airlines[wallet] = Airline({registered : true, balance : 0});
        registeredAirlines.push(wallet);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy
                (
                    string memory flightCode,
                    uint256 timestamp,
                    address airlineWallet,
                    address passengerWallet,
                    uint256 payedAmount
                ) 
                public 
                requireIsOperational
    {
        string[] memory _flights = new string[](5);
        bool[] memory paid = new bool[](5);
        uint256[] memory insurance = new uint[](5);
        uint index;

        if (insurancePassengers[passengerWallet].isInsured) {
            index = getFlightIndex(passengerWallet, flightCode) ;

            require(index == 0, "Passenger can not insure the same flight");

            insurancePassengers[passengerWallet].isPaid.push(false);
            insurancePassengers[passengerWallet].insurancePaid.push(payedAmount);
            insurancePassengers[passengerWallet].flights.push(flightCode);

        }
        else {
            // initial insurance
            paid[0] = false;
            insurance[0] = payedAmount;
            _flights[0] = flightCode;
            insurancePassengers[passengerWallet] = Passenger({
                                                                isInsured: true, 
                                                                isPaid: paid, 
                                                                insurancePaid: insurance, 
                                                                flights: _flights
                                                            });
        }

        // insurance amount cal
        contractBalance = contractBalance.add(payedAmount);
        flightPassengers[flightCode].push(passengerWallet);
        flightInsuranceTotalAmount[flightCode] = flightInsuranceTotalAmount[flightCode].add(payedAmount);
    }

    function getPassengersInsured
                                    (
                                        string flightCode
                                    ) 
                                    external 
                                    requireIsOperational 
                                    returns(address[] passengers)
    {
        return flightPassengers[flightCode];
    }

    function getInsuredAmount
                            (
                                string  flightCode,
                                address passenger
                            ) 
                            external 
                            requireIsOperational 
                            returns(uint amount)
    {
        amount = 0;
        uint index = getFlightIndex(passenger, flightCode) - 1;
        if(insurancePassengers[passenger].isPaid[index] == false)
        {
            amount = insurancePassengers[passenger].insurancePaid[index];
        }
        return amount;
    }

    function setInsuredAmount
                            (
                                string  flight,
                                address passenger,
                                uint amount
                            ) 
                            external 
                            requireIsOperational
    {
        uint index = getFlightIndex(passenger, flight) - 1;
        insurancePassengers[passenger].isPaid[index] = true;
        insurancePayment[passenger] = insurancePayment[passenger].add(amount);
    }

    function getPassengerBalance(address passenger)
                                external
                                requireIsOperational
                                returns (uint256 balance)
    {
        return insurancePayment[passenger];
    }

    function withdraw
                    (
                        address wallet
                    ) 
                    external 
                    payable 
                    requireIsOperational
    {
        require(insurancePayment[wallet] > 0, "There is no payout.");
        uint amountToPay  = insurancePayment[wallet];
        insurancePayment[wallet] = 0;
        contractBalance = contractBalance.sub(amountToPay);
        wallet.send(amountToPay);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund
                (
                    uint256 fundingAmount, 
                    address wallet
                ) 
                public 
                payable 
                requireIsOperational
    {
        airlines[wallet].balance = airlines[wallet].balance.add(fundingAmount);
        contractBalance = contractBalance.add(fundingAmount);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flightCode,
                            uint256 timestamp
                        ) 
                        pure 
                        internal 
                        returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flightCode, timestamp));
    }

    function getFlightIndex
                            (
                                address wallet, 
                                string memory flightCode
                            ) 
                            public 
                            view 
                            returns(uint index)
    {
        string[] memory flights = new string[](5);
        flights = insurancePassengers[wallet].flights;

        for(uint i = 0; i < flights.length; i++){
            if(uint(keccak256(abi.encodePacked(flights[i]))) == uint(keccak256(abi.encodePacked(flightCode)))) {
                return(i + 1);
            }
        }

        return(0);
    }


    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable
    {
        contractBalance = contractBalance.add(msg.value);
    }


}

