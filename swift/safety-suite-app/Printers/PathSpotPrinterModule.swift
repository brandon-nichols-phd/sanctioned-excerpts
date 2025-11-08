//
//  PathspotPrinterModule.swift
//  PathSpotSafetySuite
//
//  Created by Brandon Nichols on 10/27/22.
//

import Foundation

@objc(PathSpotPrinterModule)
class PathSpotPrinterModule: NSObject {
  lazy var brotherPrinterModule = BPrinterModule()
  lazy var zebraPrinterModule = ZebraPrinterModule()
  lazy var bixolonPrinterModule = BixolonPrinterModule()
  lazy var bixolonUPOSPrinterModule = BixolonUPOSPrinterModule()
  
  @objc static func requiresMainQueueSetup() -> Bool { return true }
  
  @objc func search(_ configDictionary: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("Inbound search config: \(configDictionary)----------------------------------------------------------------------------")
    guard let config = PrinterConfig(from: configDictionary) else {
      reject("invalid_config", "The provided config is invalid.", nil)
      return
    }
    if config.brand == PrinterBrand.bixolon {
      if config.connection == PrinterConnection.wifi {
        bixolonPrinterModule.searchWifi { result in
          switch result {
          case let .success(devices):
            let payload = devices.map { device in
              [
                "id": device.getAddress() ?? "",
                "name": device.getModelName() ?? "",
                "extra": [],
              ]
            }
            resolve(payload)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      
      if config.connection == PrinterConnection.bluetooth {
        bixolonPrinterModule.searchBluetooth { result in
          switch result {
          case let .success(devices):
            let payload = devices.map { device in
              [
                "id": device.getSerialNumber() ?? "",
                "name": device.getModelName() ?? "",
                "extra": [],
              ]
            }
            resolve(payload)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
    }
    
    if config.brand == PrinterBrand.bixolonupos {
      if config.connection == PrinterConnection.wifi {
        bixolonUPOSPrinterModule.searchWifi { result in
          switch result {
          case let .success(devices):
            let payload = devices.map { device in
              [
                "id": device.address,
                "name": device.modelName,
                "extra": [],
              ]
            }
            resolve(payload)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      if config.connection == PrinterConnection.bluetooth {
        bixolonUPOSPrinterModule.searchBluetooth { result in
          switch result {
          case let .success(devices):
            let payload = devices.map { device in
              [
                "id": device.serialNumber,
                "name": device.modelName,
                "extra": [],
              ]
            }
            resolve(payload)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
    }
    
    if config.brand == PrinterBrand.brother {
      if config.connection == PrinterConnection.wifi {
        brotherPrinterModule.searchWifi { result in
          switch result {
          case let .success(devices):
            let payload = (devices.map { device in
              [
                "id": device["ip"] ?? "",
                "name": device["model"] ?? "",
                "extra": [
                  "serial": device["serial"],
                ],
              ]
            })
            resolve(payload)
            
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      if config.connection == PrinterConnection.bluetooth {
        print("Inside the config.connection for brother bluetooth \(config.connection)")
        brotherPrinterModule.searchBluetooth { result in
          switch result {
          case let .success(devices):
            let payload = (devices.map { device in
              [
                "id": device["serial"] ?? "",
                "name": device["model"] ?? "",
                "extra": [
                  "serial": device["serial"],
                ],
              ]
            })
            resolve(payload)
            
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      if config.connection == PrinterConnection.ble {
        
        brotherPrinterModule.searchBLE { result in
          switch result {
          case let .success(devices):
            let payload = (devices.map { device in
              [
                "id": device["localName"] ?? "",
                "name": device["model"] ?? "",
                "extra": [
                  "serial": device["serial"],
                  "localName": device["localName"],
                ],
              ]
            })
            resolve(payload)
            
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
    }
    if config.brand == PrinterBrand.zebra {
      if config.connection == PrinterConnection.wifi {
        zebraPrinterModule.searchWifi { result in
          switch result {
          case let .success(devices):
            let payload = devices.map { device in
              [
                "id": device.address ?? "",
                "name": device.dnsName ?? "",
                "extra": [],
              ]
            }
            resolve(payload)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      
      if config.connection == PrinterConnection.bluetooth {
        zebraPrinterModule.searchBluetooth { result in
          switch result {
          case let .success(devices):
            let payload = devices.map { device in
              [
                "id": device["serialNumber"] ?? "",
                "name": device["friendlyName"] ?? "",
                "extra": [],
              ]
            }
            resolve(payload)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
    }
  }
  
  @objc func printLabel(_ configDictionary: NSDictionary, id: String, data: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let config = PrinterConfig(from: configDictionary) else {
      reject("invalid_config", "The provided config is invalid.", nil)
      return
    }
    print("Attempting to print label...")
    switch config.brand {
    case PrinterBrand.zebra:
      if config.connection == PrinterConnection.wifi {
        zebraPrinterModule.printWifiLabel(ipAddress: id, data: data) { result in
          switch result {
          case let .success(devices):
            resolve(devices)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      
      if config.connection == PrinterConnection.bluetooth {
        zebraPrinterModule.printBluetoothLabel(printerSerialNumber: id, data: data) { result in
          switch result {
          case let .success(devices):
            resolve(devices)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      return
    case PrinterBrand.bixolon:
      if config.connection == PrinterConnection.wifi {
        bixolonPrinterModule.printWifiLabel(ipAddress: id, labelData: data) { result in
          switch result {
          case let .success(devices):
            resolve(devices)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      
      if config.connection == PrinterConnection.bluetooth {
        bixolonPrinterModule.printBluetoothLabel(printerSerialNumber: id, labelData: data) { result in
          switch result {
          case let .success(devices):
            resolve(devices)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      return
    case PrinterBrand.bixolonupos:
      let modelName = config.extra?["modelName"] as? String ?? ""
      if config.connection == PrinterConnection.bluetooth {
        bixolonUPOSPrinterModule.printLabel(modelName: modelName, labelData: data) { result in
          switch result {
          case let .success(message):
            resolve(message)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      
      if config.connection == PrinterConnection.wifi {
        bixolonUPOSPrinterModule.printLabel(modelName: modelName, labelData: data) { result in
          switch result {
          case let .success(message):
            resolve(message)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      return
    case PrinterBrand.brother:
      if config.connection == PrinterConnection.wifi {
        brotherPrinterModule.printWifiLabel(ipAddress: id, data: data) { result in
          switch result {
          case let .success(message):
            resolve(message)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      if config.connection == PrinterConnection.bluetooth {
        print("Attempting to print on brother printer via bluetooth \(id) \(data)")
        
        brotherPrinterModule.printBluetoothLabel(serialNumber: id, data: data) { result in
          switch result {
          case let .success(message):
            resolve(message)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
      if config.connection == PrinterConnection.ble {
        brotherPrinterModule.printBLELabel(localName: id, data: data) { result in
          switch result {
          case let .success(message):
            resolve(message)
          case let .failure(error):
            reject(String(error.code), error.localizedDescription, error)
          }
        }
      }
    }
  }
}

enum PrinterConnection: String {
  case wifi
  case bluetooth
  case ble
}

enum PrinterBrand: String {
  case zebra
  case brother
  case bixolon
  case bixolonupos
}

struct PrinterConfig {
  var connection: PrinterConnection
  var brand: PrinterBrand
  var extra: NSDictionary?
}

extension PrinterConfig {
  init?(from dictionary: NSDictionary) {
    guard let connectionValue = dictionary["connection"] as? String,
          let brandValue = dictionary["brand"] as? String,
          let connection = PrinterConnection(rawValue: connectionValue),
          let brand = PrinterBrand(rawValue: brandValue) else {
      return nil
    }
    // Preventing the combination of brother brand with bluetooth connection
    //        if connection == .bluetooth && brand == .brother {
    //            return nil
    //        }
    self.init(connection: connection, brand: brand, extra: dictionary["extra"] as? NSDictionary)
  }
}

enum PrinterError: Error {
  case searchFailed
  case noPrinterFound
  case alreadySearching
  case printDriverFailed
  case printSettingFailed
  case printFailed
  case printFailedNoPrinter
  case noPaper
  case badMediaFeed
  case paperJam
  case commError
  case weakBattery
  case coverOpen
  case sizeError
  case printCanceled
  var code: Int {
    switch self {
    case .searchFailed: return 1001
    case .noPrinterFound: return 1002
    case .alreadySearching: return 1003
    case .printDriverFailed: return 2001
    case .printSettingFailed: return 2002
    case .printFailed: return 2003
    case .printFailedNoPrinter: return 2004
    case .noPaper: return 2005
    case .badMediaFeed: return 2006
    case .paperJam: return 2007
    case .commError: return 2008
    case .weakBattery: return 2009
    case .coverOpen: return 2010
    case .sizeError: return 2011
    case .printCanceled: return 2012
    }
  }
  
  var localizedDescription: String {
    switch self {
    case .searchFailed: return "Failed while searching"
    case .noPrinterFound: return "No printers found"
    case .alreadySearching: return "Search in progress"
    case .printDriverFailed: return "Failed while printing"
    case .printSettingFailed: return "Failed while printing"
    case .printFailed: return "Failed while printing"
    case .printFailedNoPrinter: return "Failed while printing"
    case .noPaper: return "No labels in printer"
    case .badMediaFeed: return "Labels not inserted correctly"
    case .paperJam: return "Labels are jammed"
    case .commError: return "Unable to communicate with printer"
    case .weakBattery: return "Printer not plugged in"
    case .coverOpen: return "Printer cover open"
    case .sizeError: return "Incorrect label size"
    case .printCanceled: return "Print cancelled"
    }
  }
}
