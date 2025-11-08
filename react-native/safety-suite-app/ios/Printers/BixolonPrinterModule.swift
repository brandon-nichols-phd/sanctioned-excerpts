//
//  BixolonPrinterModule.swift
//  PathSpotSafetySuite
//
//  Created by Brandon Nichols on 4/29/24.
//

import Foundation

typealias BixolonSearchWifiCompletion = (Result<[LabelPrinterObject], PrinterError>) -> Void
typealias BixolonSearchBluetoothCompletion = (Result<[LabelPrinterObject], PrinterError>) -> Void

class BixolonPrinterModule: NSObject, LabelPrinterSDKDelegate {
    var sdk: LabelPrinterSDK = LabelPrinterSDK()
    private var searchWifiCompletion: BixolonSearchWifiCompletion?
    private var foundPrinters: [LabelPrinterObject] = []

    override init() {
        super.init()
        sdk.delegate = self
    }

    func searchWifi(completion: @escaping BixolonSearchWifiCompletion) {
        print("Bixolon WiFi searchWifi")
        foundPrinters.removeAll()
        searchWifiCompletion = completion
        sdk.lookupPrinter(withCount: 3, interval: 1000)
    }

    func searchBluetooth(completion: @escaping BixolonSearchBluetoothCompletion) {
        DispatchQueue.global().async {
            if let devices = self.sdk.getPairedDevices() as? [LabelPrinterObject] {
                DispatchQueue.main.async {
                    completion(.success(devices))
                }
            } else {
                DispatchQueue.main.async {
                    completion(.failure(PrinterError.noPrinterFound))
                }
            }
        }
    }

    func printWifiLabel(ipAddress: String, labelData: String, completion: @escaping (Result<[Any], PrinterError>) -> Void) {
        if sdk.isConnected() {
            sdk.disconnect()
        }

        sdk.setKeepNetworkConnection(1 /* Enable */ )

        guard sdk.open() == .SDK_RESULT_SUCCESS,
              sdk.connect(withAddress: ipAddress, port: "9100") == .SDK_RESULT_SUCCESS
        else {
            sdk.close()
            return completion(.failure(PrinterError.noPrinterFound))
        }

        guard let data = labelData.data(using: .utf8),
              sdk.printRawData(data) == .SDK_RESULT_SUCCESS,
              sdk.doPrint(1) == .SDK_RESULT_SUCCESS
        else {
            sdk.close()
            return completion(.failure(PrinterError.printFailed))
        }

        sdk.close()
        return completion(.success([]))
    }

    func printBluetoothLabel(printerSerialNumber: String, labelData: String, completion: @escaping (Result<[Any], PrinterError>) -> Void) {
        if sdk.isConnected() {
            sdk.disconnect()
        }

        guard sdk.open() == .SDK_RESULT_SUCCESS,
              sdk.connect(withSerialNumber: printerSerialNumber) == .SDK_RESULT_SUCCESS

        else {
            sdk.close()
            return completion(.failure(PrinterError.noPrinterFound))
        }

        guard let data = labelData.data(using: .utf8),
              sdk.printRawData(data) == .SDK_RESULT_SUCCESS,
              sdk.doPrint(1) == .SDK_RESULT_SUCCESS
        else {
            sdk.close()
            return completion(.failure(PrinterError.printFailed))
        }

        sdk.close()
        return completion(.success([]))
    }
}

// MARK: - LabelPrinterSDKDelegate Override

extension BixolonPrinterModule {
    func willConnect(_ controller: LabelPrinterSDK!, printer: LabelPrinterObject!) {
        print("Bixolon WiFi willConnect")
    }

    func didConnect(_ controller: LabelPrinterSDK!, printer: LabelPrinterObject!) {
      print("Bixolon WiFi didConnect")
    }

    func didNotConnect(_ controller: LabelPrinterSDK!, printer: LabelPrinterObject!, withError error: Error!) {
      print("Bixolon WiFi didNotConnect")
    }

    func didDisconnect(_ controller: LabelPrinterSDK!, printer: LabelPrinterObject!) {
      print("Bixolon WiFi didDisconnect")
    }

    func didBeBrokenConnection(_ controller: LabelPrinterSDK!, printer: LabelPrinterObject!, withError error: Error!) {
      print("Bixolon WiFi didBeBrokenConnection")
    }

    func willLookupPrinter(_ controller: LabelPrinterSDK!) {
      print("Bixolon WiFi willLookupPrinter")
    }

    func didFindPrinter(_ controller: LabelPrinterSDK!, printer: LabelPrinterObject!) {
          print("Bixolon WiFi didFindPrinter")
        foundPrinters.append(printer)
    }

    func didLookupPrinters(_ controller: LabelPrinterSDK!, printerList: [Any]!) {
      print("Bixolon WiFi didLookupPrinters")
        guard let completion = searchWifiCompletion else { return }

        if let printers = printerList as? [LabelPrinterObject] {
            DispatchQueue.main.async {
                completion(.success(printers))
            }
        } else {
            DispatchQueue.main.async {
                completion(.success(self.foundPrinters))
            }
        }

        searchWifiCompletion = nil
    }

    func canNotFoundPrinter() {
      print("Bixolon WiFi canNotFoundPrinter")
      guard let completion = searchWifiCompletion else { return }
      
      DispatchQueue.main.async {
          completion(.failure(.noPrinterFound))
      }
      
      searchWifiCompletion = nil
    }
}
