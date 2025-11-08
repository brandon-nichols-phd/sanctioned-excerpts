//
//  ZebraPrinterModule.swift
//  PathSpotSafetySuite
//
//  Created by Brandon Nichols on 2/20/24.
//

import ExternalAccessory
import Foundation

typealias ZebraSearchWifiCompletion = (Result<[DiscoveredPrinterNetwork], PrinterError>) -> Void
typealias ZebraSearchBluetoothCompletion = (Result<[[String: String]], PrinterError>) -> Void

class ZebraPrinterModule {
    func searchWifi(completion: @escaping ZebraSearchWifiCompletion) {
        DispatchQueue.global().async {
            do {
                if let devices = try NetworkDiscoverer.localBroadcast() as? [DiscoveredPrinterNetwork] {
                    DispatchQueue.main.async {
                        completion(.success(devices))
                    }
                } else {
                    DispatchQueue.main.async {
                        completion(.failure(PrinterError.noPrinterFound))
                    }
                }
            } catch let error as NSError {
                DispatchQueue.main.async {
                    print(error)
                    completion(.failure(PrinterError.noPrinterFound))
                }
            }
        }
    }

    func searchBluetooth(completion: @escaping ZebraSearchBluetoothCompletion) {
        let accessoryManager = EAAccessoryManager.shared()
        let connectedAccessories = accessoryManager.connectedAccessories
        let printers: [[String: String]] = connectedAccessories.compactMap { accessory in
            guard accessory.protocolStrings.contains("com.zebra.rawport") else { return nil }
            return ["friendlyName": accessory.name, "serialNumber": accessory.serialNumber]
        }

        completion(.success(printers))
    }

    func printWifiLabel(ipAddress: String, data: String, completion: @escaping (Result<[Any], PrinterError>) -> Void) {
        let thePrinterConn = TcpPrinterConnection(address: ipAddress, andWithPort: 9100)
        let success = thePrinterConn?.open()

        var error: NSError?

        let zplData = getTestLabel(for: PRINTER_LANGUAGE_ZPL, label: data)
        let sendDataSuccess = thePrinterConn?.write(zplData.data(using: .utf8), error: &error)

        if (sendDataSuccess == nil) || error != nil {
            // An error occurred, handle it here
            print("An error occurred: \(error?.localizedDescription ?? "WiFi Printer Error")")
            return completion(.failure(PrinterError.printFailed))
        }

        // Close the connection to release resources.
        thePrinterConn?.close()
        return completion(.success([]))
    }

    func printBluetoothLabel(printerSerialNumber: String, data: String, completion: @escaping (Result<[Any], PrinterError>) -> Void) {
        guard let connection = MfiBtPrinterConnection(serialNumber: printerSerialNumber) else {
            print("[write to printer] Unable to create connection")
            return completion(.failure(PrinterError.noPrinterFound))
        }

        if connection.open() {
            var error: NSError?
            let language: PrinterLanguage = PRINTER_LANGUAGE_ZPL
            let testLabel = getTestLabel(for: language, label: data)

            if let data = testLabel.data(using: .utf8) {
                connection.write(data, error: &error)
            }

            connection.close()
            return completion(.success([]))
        } else {
            return completion(.failure(PrinterError.noPrinterFound))
        }
    }

    private func getTestLabel(for language: PrinterLanguage, label: String) -> String {
        switch language {
        case PRINTER_LANGUAGE_ZPL:
            return "^XA^FO17,16^GB379,100,8^FS^FT65,100^A0N,135,134^FD\(label)^FS^XZ"
        case PRINTER_LANGUAGE_CPCL:
            return "! 0 200 200 406 1\r\nON-FEED IGNORE\r\nBOX 20 20 380 380 8\r\nT 0 6 137 177 \(label)\r\nPRINT\r\n"
        default:
            return ""
        }
    }
}
