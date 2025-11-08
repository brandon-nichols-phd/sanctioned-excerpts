//
//  BixolonUPOSPrinterModule.swift
//  PathSpotSafetySuite
//
//  Created by Brandon Nichols on 4/29/24.
//

import Foundation

typealias BixolonUPOSSearchCompletion = (Result<[UPOSPrinter], PrinterError>) -> Void

class BixolonUPOSPrinterModule {
    var deviceController = UPOSPrinterController()
    var printerList = UPOSPrinters()
    var lookupCompletion: BixolonUPOSSearchCompletion?

    init() {
        registerNotiLookupWifi()
        registerNotiLookupBT()
    }

    func registerNotiLookupBT() {
        let notiCenter = NotificationCenter.default
        notiCenter.addObserver(forName: NSNotification.Name(rawValue: __NOTIFICATION_NAME_BT_WILL_LOOKUP_),
                               object: nil,
                               queue: OperationQueue.current) {
            _ in
            print("bt start")
        }

        notiCenter.addObserver(forName: NSNotification.Name(rawValue: __NOTIFICATION_NAME_BT_FOUND_PRINTER_),
                               object: nil,
                               queue: OperationQueue.current) {
            [weak self] n in
            guard let strongSelf = self else { return }
            if let userinfo = n.userInfo {
                if let lookupDevice: UPOSPrinter = userinfo[__NOTIFICATION_NAME_BT_FOUND_PRINTER_] as? UPOSPrinter {
                    print("modelname = \(lookupDevice)")
                    strongSelf.printerList.addDevice(lookupDevice)
                }
            }
        }

        notiCenter.addObserver(forName: NSNotification.Name(rawValue: __NOTIFICATION_NAME_BT_LOOKUP_COMPLETE_),
                               object: nil,
                               queue: OperationQueue.current) {
            [weak self] _ in
            guard let strongSelf = self else { return }
            guard let completion = strongSelf.lookupCompletion else { return }
            completion(.success(strongSelf.printerList.getList() as! [UPOSPrinter]))
        }
    }

    func registerNotiLookupWifi() {
        let notiCenter = NotificationCenter.default
        notiCenter.addObserver(forName: NSNotification.Name(rawValue: __NOTIFICATION_NAME_WIFI_WILL_LOOKUP_),
                               object: nil,
                               queue: OperationQueue.current) {
            _ in
            print("wifi start")
        }

        notiCenter.addObserver(forName: NSNotification.Name(rawValue: __NOTIFICATION_NAME_WIFI_FOUND_PRINTER_),
                               object: nil,
                               queue: OperationQueue.current) {
            [weak self] n in
            guard let strongSelf = self else { return }
            if let userinfo = n.userInfo {
                if let lookupDevice: UPOSPrinter = userinfo[__NOTIFICATION_NAME_WIFI_FOUND_PRINTER_] as? UPOSPrinter {
                    print("modelname = \(lookupDevice)")
                    strongSelf.printerList.addDevice(lookupDevice)
                }
            }
        }

        notiCenter.addObserver(forName: NSNotification.Name(rawValue: __NOTIFICATION_NAME_WIFI_LOOKUP_COMPLETE_),
                               object: nil,
                               queue: OperationQueue.current) {
            [weak self] _ in
            guard let strongSelf = self else { return }
            guard let completion = strongSelf.lookupCompletion else { return }
            completion(.success(strongSelf.printerList.getList() as! [UPOSPrinter]))
        }
    }

    func searchWifi(completion: @escaping BixolonUPOSSearchCompletion) {
        printerList.removeAllDevices()
        deviceController.getRegisteredDevice().removeAllDevices()

        printerList = UPOSPrinters()
        deviceController = UPOSPrinterController()

        lookupCompletion = completion
        deviceController.refreshWifiLookup()
    }

    func searchBluetooth(completion: @escaping BixolonUPOSSearchCompletion) {
        printerList.removeAllDevices()
        deviceController.getRegisteredDevice().removeAllDevices()

        printerList = UPOSPrinters()
        deviceController = UPOSPrinterController()

        lookupCompletion = completion
        deviceController.refreshBTLookup()
    }

    func printLabel(modelName: String, labelData: String, completion: @escaping (Result<[Any], PrinterError>) -> Void) {
        var openResult = -1
        if !deviceController.opened && !deviceController.claimed {
            openResult = deviceController.connect(modelName)
        } else {
            openResult = 0
        }

        // 0 - success
        // 102 - already claimed
        // 301 - already opened
        if openResult == 0 || openResult == 102 || openResult == 301 {
            let status = deviceController.getPrinterStatus()

            if status == 11 {
                completion(.failure(.coverOpen))
                return
            }

            if status == 24 {
                completion(.failure(.noPaper))
                return
            }

            if status == 53 {
                completion(.failure(.noPrinterFound))
                return
            }

            if deviceController.printNormal(2, data: labelData) != 0 {
                completion(.failure(.printFailed))
                return
            }

            if status == 25 {
                completion(.success(["Label roll running low"]))
            } else {
                completion(.success([]))
            }

        } else {
            completion(.failure(.printFailedNoPrinter))
        }
    }
}
