//
//  PathSpotPrinterModule.m
//  PathSpotSafetySuite
//
//  Created by Brandon Nichols  on 2/26/24.
//

#import <Foundation/Foundation.h>
#import <React/RCTLog.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PathSpotPrinterModule, NSObject)

RCT_EXTERN_METHOD(search:(NSDictionary *)configDictionary
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(printLabel:(NSDictionary *)configDictionary
                   id:(NSString *)id
                   data:(NSString *)data
                   resolver:(RCTPromiseResolveBlock)resolve
                   rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deprecated_printBrotherTemplate:(NSString *)ipAddress
                  templateKey:(NSUInteger *)templateKey
                  replaceItems:(NSArray *)replaceItems
                  model:(NSString *)model
                  copies:(NSUInteger *)copies
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
